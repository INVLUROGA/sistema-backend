-- Migración: estado de cada marcación en dbo.zk_Transactions.
-- label_estado se guarda al recibir la marcación del huellero (services/transactionService.js),
-- según quién marcó ese día (por DNI):
--   'Es colaborador'           empleado activo (tb_empleados)
--   'activo para <programa>'   cliente con membresía vigente ese día (tb_seguimientos)
--   'membresia inactiva'       membresía vigente pero desactivado a mano (zk_Users.IsActive = 0)
--   'cliente sin membresia'    cliente sin membresía vigente
--   NULL                       ni cliente ni empleado
-- Script idempotente: se puede ejecutar más de una vez.

IF COL_LENGTH('dbo.zk_Transactions', 'label_estado') IS NULL
BEGIN
    ALTER TABLE dbo.zk_Transactions ADD label_estado VARCHAR(50) NULL;
END;
