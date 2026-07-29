import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../config/db.ts";
import { ApiError } from "../utils/ApiError.ts";
import { AuditService } from "./AuditService.ts";

const JWT_SECRET = process.env.JWT_SECRET || "POS_SUPER_SECRET_KEY_2026";

export class AuthService {
  static async register(data: any, userId?: string) {
    const { username, password, fullName, role } = data;

    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      throw new ApiError(400, "Username sudah digunakan");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        fullName,
        role: role || "CASHIER",
      },
    });

    // Clean user object before returning
    const { password: _, ...userWithoutPassword } = user;

    if (userId) {
      await AuditService.log({
        userId,
        action: "CREATE_USER",
        entity: "User",
        entityId: user.id,
        details: { username: user.username, role: user.role }
      });
    }

    return userWithoutPassword;
  }

  static async login(data: any, ip?: string) {
    const { username, password } = data;

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user || !user.isActive) {
      throw new ApiError(401, "Username atau password salah");
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      throw new ApiError(401, "Username atau password salah");
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Create Audit Log
    await AuditService.log({
      userId: user.id,
      action: "LOGIN",
      entity: "User",
      entityId: user.id,
      ipAddress: ip,
    });

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    const { password: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
  }
  static async getAllUsers() {
    return await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  static async updateUser(id: string, data: any, userId?: string) {
    const { password, ...updateData } = data;
    
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        isActive: true,
      },
    });

    if (userId) {
      await AuditService.log({
        userId,
        action: "UPDATE_USER",
        entity: "User",
        entityId: updatedUser.id,
        details: { username: updatedUser.username }
      });
    }

    return updatedUser;
  }

  static async deleteUser(id: string, userId?: string) {
    const user = await prisma.user.delete({
      where: { id },
    });

    if (userId) {
      await AuditService.log({
        userId,
        action: "DELETE_USER",
        entity: "User",
        entityId: id,
        details: { username: user.username }
      });
    }

    return user;
  }
}
