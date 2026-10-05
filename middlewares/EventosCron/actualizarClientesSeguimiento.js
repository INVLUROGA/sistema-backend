const { sql, poolPromise } = require("../../database/connectionSQLserver");
const { autorizacionPorDefecto } = require("../../services/personaHuelleroService");

// Hoy en Perú (YYYY-MM-DD). El server corre en UTC; Perú es UTC-5 todo el año.
const hoyPeru = (ahora = new Date()) => ahora.toLocaleDateString("en-CA", { timeZone: "America/Lima" });

/// Sincroniza zk_Users.IsActive con los seguimientos (tb_seguimientos):
/// - IsActive = false si hoy (Perú) es posterior a la fecha de vencimiento de la membresía.
/// - IsActive = true si la membresía está vigente (ej. el cliente renovó).
/// Se une por DNI: zk_Users.dni = tb_clientes.numDoc_cli. Si un documento tiene varios
/// clientes o membresías, se usa el vencimiento más lejano.
/// No toca a los empleados activos (tb_empleados) aunque estén registrados como clientes, ni a
/// las personas sin cliente o sin seguimientos.
/// A quien cambia de estado se le envía la orden a los huelleros activos: desactivado -> se borra su
/// autorización de acceso (el equipo lo reconoce pero no lo deja entrar); reactivado -> se le devuelve.
/// Debe correr DESPUÉS de actualizarSeguimientos (que reconstruye tb_seguimientos).
/// Retorna { hoy, desactivados, reactivados } o { omitido } si no se hizo nada.
const actualizarClientesSeguimiento = async (ahora = new Date()) => {
  try {
    const pool = await poolPromise;
    const hoy = hoyPeru(ahora);

    // Protección: actualizarSeguimientos borra y recrea la tabla; si quedó vacía (falló),
    // todos parecerían vencidos. En ese caso no se cambia nada.
    const { recordset } = await pool
      .request()
      .query("SELECT COUNT(*) AS n FROM dbo.tb_seguimientos WHERE flag = 1");
    if (recordset[0].n === 0) {
      console.warn("[actualizarClientesSeguimiento] tb_seguimientos está vacía: no se actualiza zk_Users");
      return { hoy, omitido: "sin seguimientos" };
    }

    // Cambio de estado + órdenes al huellero en una sola transacción (o se hacen ambas o ninguna)
    const { franjaHoraria, puertas } = autorizacionPorDefecto();
    const transaccion = new sql.Transaction(pool);
    await transaccion.begin();
    let result;
    try {
      result = await new sql.Request(transaccion)
      .input("hoy", sql.Date, hoy)
      .input("idBase", sql.Int, Math.floor(ahora.getTime() / 1000) % 1000000000)
      .input("franja", sql.Int, franjaHoraria)
      .input("puertas", sql.Int, puertas)
      .query(`
        DECLARE @cambios TABLE (UserCode INT, activo BIT);

        WITH vencimientos AS (
          SELECT LTRIM(RTRIM(c.numDoc_cli)) AS doc, MAX(CAST(s.fecha_vencimiento AS date)) AS vence
          FROM dbo.tb_seguimientos s
          JOIN dbo.tb_clientes c ON c.id_cli = s.id_cli
          WHERE s.flag = 1 AND s.fecha_vencimiento IS NOT NULL
            AND c.numDoc_cli IS NOT NULL AND LTRIM(RTRIM(c.numDoc_cli)) <> ''
          GROUP BY LTRIM(RTRIM(c.numDoc_cli))
        ),
        nuevoEstado AS (
          SELECT u.UserCode, CAST(CASE WHEN v.vence < @hoy THEN 0 ELSE 1 END AS bit) AS activo
          FROM dbo.zk_Users u
          JOIN vencimientos v ON v.doc = LTRIM(RTRIM(u.dni))
          WHERE NOT EXISTS (
            SELECT 1 FROM dbo.tb_empleados e
            WHERE e.flag = 1 AND LTRIM(RTRIM(e.numDoc_empl)) = LTRIM(RTRIM(u.dni))
          )
        )
        UPDATE u
        SET u.IsActive = n.activo,
            u.UpdateTime = FORMAT(SYSDATETIMEOFFSET(), 'yyyy-MM-dd HH:mm:ss zzz')
        OUTPUT inserted.UserCode, inserted.IsActive INTO @cambios
        FROM dbo.zk_Users u
        JOIN nuevoEstado n ON n.UserCode = u.UserCode
        WHERE ISNULL(u.IsActive, 1) <> n.activo;

        -- Al huellero: sin autorización de acceso no puede entrar ("Periodo de tiempo no válido").
        -- Desactivado -> se borra su autorización; reactivado -> se le vuelve a dar.
        INSERT INTO dbo.zk_QueueCMD (DeviceSN, CMD, CreationTime)
        SELECT d.DeviceSN,
               CONCAT('C:', @idBase + c.n, ':',
                      CASE WHEN c.activo = 0
                           THEN CONCAT('DATA DELETE userauthorize Pin=', c.UserCode)
                           ELSE CONCAT('DATA UPDATE userauthorize Pin=', c.UserCode, CHAR(9),
                                       'AuthorizeTimezoneId=', @franja, CHAR(9), 'AuthorizeDoorId=', @puertas)
                      END),
               FORMAT(SYSDATETIMEOFFSET(), 'yyyy-MM-dd HH:mm:ss zzz')
        FROM (SELECT UserCode, activo, ROW_NUMBER() OVER (ORDER BY UserCode) AS n FROM @cambios) c
        CROSS JOIN dbo.zk_Devices d
        WHERE d.IsActive = 1
        ORDER BY c.n, d.DeviceSN;

        SELECT UserCode, activo FROM @cambios;
      `);
      await transaccion.commit();
    } catch (error) {
      await transaccion.rollback().catch(() => {});
      throw error;
    }

    const desactivados = result.recordset.filter((r) => r.activo === false).length;
    const reactivados = result.recordset.filter((r) => r.activo === true).length;
    console.log(
      `[actualizarClientesSeguimiento] ${hoy}: ${desactivados} desactivados (membresía vencida), ${reactivados} reactivados; enviado a los huelleros activos`
    );
    return { hoy, desactivados, reactivados };
  } catch (error) {
    console.error("[actualizarClientesSeguimiento] Error", error);
    return { error: error.message };
  }
};

module.exports = {
  hoyPeru,
  actualizarClientesSeguimiento,
};
