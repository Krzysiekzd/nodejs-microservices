import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  async createUser(email: string, password: string) {
    const hashed = await bcrypt.hash(password, 10);
    const user = this.userRepo.create({ email, password: hashed });
    return this.userRepo.save(user);
  }

  async findByEmail(email: string): Promise<User | undefined> {
    const user = await this.userRepo.findOne({ where: { email } });
    return user ?? undefined;
  }
}