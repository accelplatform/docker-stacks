:on error exit

USE [$(APP_DB)];
GO

PRINT 'Mapping user $(APP_USER) to database $(APP_DB)';

IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'$(APP_USER)')
BEGIN
    CREATE USER [$(APP_USER)] FOR LOGIN [$(APP_USER)];
    PRINT '  user created in $(APP_DB).';
END
ELSE
BEGIN
    PRINT '  user already exists in $(APP_DB).';
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.database_role_members rm
    JOIN sys.database_principals r ON r.principal_id = rm.role_principal_id
    JOIN sys.database_principals m ON m.principal_id = rm.member_principal_id
    WHERE r.name = N'db_owner' AND m.name = N'$(APP_USER)'
)
BEGIN
    ALTER ROLE db_owner ADD MEMBER [$(APP_USER)];
    PRINT '  user added to db_owner role.';
END
GO

PRINT 'Application user-database mapping complete.';
GO
