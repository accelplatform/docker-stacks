:on error exit

PRINT 'Creating application database: $(APP_DB) with collation $(APP_DB_COLLATION)';

IF NOT EXISTS (SELECT 1 FROM sys.databases WHERE name = N'$(APP_DB)')
BEGIN
    DECLARE @sql nvarchar(max) =
        N'CREATE DATABASE [$(APP_DB)] COLLATE $(APP_DB_COLLATION);';
    EXEC sp_executesql @sql;
    PRINT '  database created.';
END
ELSE
BEGIN
    PRINT '  database already exists, skipping CREATE DATABASE.';
END
GO

PRINT 'Application database setup complete.';
GO
