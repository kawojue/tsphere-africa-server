import { JwtService } from '@nestjs/jwt'
import { USER_REGEX } from 'utils/regExp'
import { genToken } from 'helpers/genToken'
import { Injectable } from '@nestjs/common'
import { genRandomCode } from 'helpers/genRandStr'

@Injectable()
export class MiscService {
    constructor(
        private readonly jwtService: JwtService,
    ) { }

    async generateAccessToken({ sub, role }: JwtPayload) {
        return await this.jwtService.signAsync({ sub, role })
    }

    isValidUsername(username: string) {
        return USER_REGEX.test(username)
    }

    genenerateToken(id: string) {
        const randomCode = genRandomCode()
        const tk = genToken(id, randomCode)
        const token = Buffer.from(tk.token).toString('base64')

        return {
            token,
            randomCode,
            token_expiry: tk.token_expiry
        }
    }
}