// src/user/user.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { CreateUserDto } from '../common/dto/create-user.dto';

@Injectable()
export class UserService {

  // Your methods
  async create(createUserDto: CreateUserDto) {
    return true;
  }

  private readonly users = [
    {
      userId: 1,
      username: process.env.USERID,
      Password: process.env.PASS 
    },
  ];

  async findOne(username: string, password: string) {
    console.log( this.users)
    const valid = this.users.find(user => user.username === username && password === user.Password);
    if (valid) {
      return username;
    } else {
      throw new UnauthorizedException("Invalid username or password")
    }
  }



}
