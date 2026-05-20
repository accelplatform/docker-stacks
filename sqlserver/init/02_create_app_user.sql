:on error exit

PRINT 'Creating application login: $(APP_USER)';

IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = N'$(APP_USER)')
BEGIN
    DECLARE @sql nvarchar(max) =
        N'CREATE LOGIN [$(APP_USER)] WITH PASSWORD = ''$(APP_USER_PASSWORD)'', CHECK_POLICY = OFF, DEFAULT_DATABASE = [$(APP_DB)];';
    EXEC sp_executesql @sql;
    PRINT '  login created.';
END
ELSE
BEGIN
    PRINT '  login already exists, skipping CREATE LOGIN.';
    -- 既存ログインのデフォルトDBを修正
    DECLARE @sql2 nvarchar(max) =
        N'ALTER LOGIN [$(APP_USER)] WITH DEFAULT_DATABASE = [$(APP_DB)];';
    EXEC sp_executesql @sql2;
    PRINT '  default DB updated.';
END
GO

PRINT 'Application login setup complete.';
GO
