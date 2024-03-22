interface ExpressUser extends Express.User {
    sub: string
    role: Roles
}

interface IRequest extends Request {
    user: ExpressUser
}

interface JwtPayload {
    sub: string
    role: Roles
}