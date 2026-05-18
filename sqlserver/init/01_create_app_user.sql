IF '$(APP_USER)' != '' AND '$(APP_USER_PASSWORD)' != ''
BEGIN
    PRINT 'Creating application user: $(APP_USER)';

    CREATE LOGIN [$(APP_USER)] WITH PASSWORD = '$(APP_USER_PASSWORD)';
    CREATE USER [$(APP_USER)] FOR LOGIN [$(APP_USER)];

    ALTER ROLE db_owner ADD MEMBER [$(APP_USER)];

    PRINT 'Application user created successfully';
END
ELSE
BEGIN
    PRINT 'APP_USER and APP_USER_PASSWORD must be provided to create the application user.';
END