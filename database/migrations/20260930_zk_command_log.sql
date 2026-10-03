-- Migración: historial de comandos entregados a los huelleros y su resultado.
-- /iclock/getrequest registra cada comando que entrega (y lo quita de dbo.zk_QueueCMD);
-- /iclock/devicecmd guarda el Return con que el equipo responde (0 o más = aplicado,
-- negativo = error). Así la página sabe si el cambio llegó y se aplicó en el huellero.
-- Script idempotente: se puede ejecutar más de una vez.

IF OBJECT_ID('dbo.zk_CommandLog', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.zk_CommandLog (
        Id          INT IDENTITY(1,1) PRIMARY KEY,
        DeviceSN    VARCHAR(20)  NOT NULL,
        CmdId       VARCHAR(20)  NOT NULL,   -- el ID de "C:<id>:..." que el equipo devuelve en su respuesta
        Pin         INT          NULL,       -- persona afectada (NULL si no es de una persona, ej. DATA QUERY)
        Dedo        INT          NULL,       -- FingerID, si el comando es de una huella
        Operacion   VARCHAR(40)  NOT NULL,   -- ej. "envío de huella", "borrado del usuario"
        EntregadoEn DATETIME2(0) NOT NULL,   -- UTC
        Resultado   INT          NULL,       -- Return del equipo (NULL = aún sin respuesta)
        ResultadoEn DATETIME2(0) NULL        -- UTC
    );
    CREATE INDEX IX_zk_CommandLog_Equipo_Cmd ON dbo.zk_CommandLog (DeviceSN, CmdId);
    CREATE INDEX IX_zk_CommandLog_Pin ON dbo.zk_CommandLog (Pin, EntregadoEn);
END;
