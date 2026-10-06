-- Migración: contadores de beneficios usados en dbo.tb_seguimientos.
-- dias_congelamientos_usados: días de congelamiento consumidos en el periodo de la membresía.
-- citas_nutricionista_usadas: citas con nutricionista consumidas en el periodo de la membresía.
-- Script idempotente: se puede ejecutar más de una vez.

IF COL_LENGTH('dbo.tb_seguimientos', 'dias_congelamientos_usados') IS NULL
BEGIN
    ALTER TABLE dbo.tb_seguimientos
        ADD dias_congelamientos_usados INT NULL
        CONSTRAINT DF_tb_seguimientos_dias_congelamientos_usados DEFAULT 0 WITH VALUES;
END;

IF COL_LENGTH('dbo.tb_seguimientos', 'citas_nutricionista_usadas') IS NULL
BEGIN
    ALTER TABLE dbo.tb_seguimientos
        ADD citas_nutricionista_usadas INT NULL
        CONSTRAINT DF_tb_seguimientos_citas_nutricionista_usadas DEFAULT 0 WITH VALUES;
END;
