USE CobbleNameDemo;
GO


-- AddUser
-- Called by POST/api/users
-- Adds new users to the users Table 
-- Returns the row that was inserted, read back from the table
CREATE OR ALTER PROCEDURE AddUser
    @Name NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO Users (Name)
    VALUES (@Name);

    SELECT Id, Name
    FROM Users
    WHERE Id = SCOPE_IDENTITY();
END;
GO

-- GetUsers 
-- Called by GET /api/users 
-- Retrieves all users currently stored in the users table 
-- Converts these rows to JSON for the react frontend 
CREATE OR ALTER PROCEDURE GetUsers
AS
BEGIN
    SELECT Id, Name
    FROM Users
    ORDER BY Id;
END;
GO
