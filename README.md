

# reset password of local mssql
sqlcmd -S localhost -E

sqlcmd -S localhost -U sa -P "OldPassword"

ALTER LOGIN sa WITH PASSWORD = 'NewPassword123';
GO

sqlcmd -S localhost -U sa -P "NewPassword123"


net start mssqlserver

**********procdure using now********

GetvalidateProjectId

GetvalidateOutletName

GetSurveyByOutletName

GetSurveyQuestionMastercvdsJSON

OutletImportJSONSAVE