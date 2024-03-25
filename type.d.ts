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

interface IFile {
    url: string
    path: string
    type: string
}