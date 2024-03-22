const restrictedUser: string[] = [
    "profile", "admin", "account", "api",
    "root", "user", "signup", "login", "edit",
    "password", "reset", "logout", "talentsphere",
    "talentsphereafrica", "talentsphere-africa",
    "account", "home", "reset", "auth",
    "main", "dashboard", "talentsphere_africa"
]

export const USER_REGEX = new RegExp(`^(?!(?:${restrictedUser.join('|')}))[a-zA-Z][a-zA-Z0-9-_]{2,23}$`)