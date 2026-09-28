-- Migración: columnas de latido (heartbeat) para dbo.zk_Devices
-- Usadas por GET /iclock/ping. El estado online/offline NO se guarda:
-- se calcula a partir de ultima_conexion (ver services/deviceService.js).
-- Script idempotente: se puede ejecutar más de una vez.

IF COL_LENGTH('dbo.zk_Devices', 'ultima_conexion') IS NULL
BEGIN
    ALTER TABLE dbo.zk_Devices ADD ultima_conexion DATETIME2(0) NULL; -- UTC
END;

IF COL_LENGTH('dbo.zk_Devices', 'ultima_ip') IS NULL
BEGIN
    ALTER TABLE dbo.zk_Devices ADD ultima_ip VARCHAR(45) NULL; -- IPv4 o IPv6
END;
