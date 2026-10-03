-- Migración: el historial de comandos también registra los borrados en el momento de pedirlos,
-- para seguir su estado (pendiente -> sincronizado/confirmado) aunque la persona o la huella
-- ya no estén en la BD.
--   EntregadoEn NULL = registrado al pedirlo, aún sin marca de entrega
--   CreadoEn         = cuándo se registró (UTC)
--   Nombre           = nombre de la persona eliminada (ya no está en dbo.zk_Users)
-- Script idempotente: se puede ejecutar más de una vez.

IF COL_LENGTH('dbo.zk_CommandLog', 'CreadoEn') IS NULL
BEGIN
    ALTER TABLE dbo.zk_CommandLog
        ADD CreadoEn DATETIME2(0) NOT NULL
            CONSTRAINT DF_zk_CommandLog_CreadoEn DEFAULT SYSUTCDATETIME();
END;

IF COL_LENGTH('dbo.zk_CommandLog', 'Nombre') IS NULL
BEGIN
    ALTER TABLE dbo.zk_CommandLog ADD Nombre VARCHAR(40) NULL;
END;

IF EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.zk_CommandLog') AND name = 'EntregadoEn' AND is_nullable = 0
)
BEGIN
    ALTER TABLE dbo.zk_CommandLog ALTER COLUMN EntregadoEn DATETIME2(0) NULL;
END;
