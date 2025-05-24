import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
@UseGuards(JwtAuthGuard)  
@Controller('user')
export class UserController {
    
    @Get('profile')
    getProfile() {
        return "hii"
        // Your code to return the user's profile data
    }
}
 