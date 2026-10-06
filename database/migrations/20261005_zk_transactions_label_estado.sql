-- Migración: estado de cada marcación en dbo.zk_Transactions.
-- label_estado se guarda al recibir la marcación del huellero, según el estado de la persona en
-- ese momento: 'membresia inactiva' si zk_Users.IsActive = 0 (intentó entrar con la membresía
-- vencida o desactivada); NULL si estaba activa.
-- Script idempotente: se puede ejecutar más de una vez.

IF COL_LENGTH('dbo.zk_Transactions', 'label_estado') IS NULL
BEGIN
    ALTER TABLE dbo.zk_Transactions ADD label_estado VARCHAR(50) NULL;
END;
