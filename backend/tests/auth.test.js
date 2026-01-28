import request from "supertest";
import "../src/index.js"; // Import to register routes
import { app, server } from "../src/lib/socket.js";
import mongoose from "mongoose";

// Mock Cloudinary to avoid external API calls
jest.mock("../src/lib/cloudinary.js", () => ({
    uploader: {
        upload: jest.fn().mockResolvedValue({ secure_url: "http://mock-url.com/image.jpg" }),
    },
    config: jest.fn(),
}));

// Mock Redis to prevent connection errors
jest.mock("../src/lib/redisClient.js", () => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    getClient: jest.fn().mockReturnValue({
        hSet: jest.fn(),
        hDel: jest.fn(),
        hGet: jest.fn(),
        quit: jest.fn(),
    }),
    getPubClient: jest.fn(),
    getSubClient: jest.fn(),
}));

describe("Auth Endpoints", () => {
    afterAll(async () => {
        // Close the http server if it was started
        if (server.listening) {
            server.close();
        }
    });

    it("should register a new user", async () => {
        const res = await request(app).post("/api/auth/signup").send({
            fullName: "Test User",
            email: "test@example.com",
            password: "password123",
        });
        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty("accessToken");
        expect(res.body).toHaveProperty("_id");
    });

    it("should not register a user with invalid email", async () => {
        const res = await request(app).post("/api/auth/signup").send({
            fullName: "Test User",
            email: "invalid-email",
            password: "password123",
        });
        expect(res.statusCode).toEqual(400); // Validation error
        expect(res.body).toHaveProperty("errors");
    });

    it("should login an existing user", async () => {
        // First signup
        await request(app).post("/api/auth/signup").send({
            fullName: "Login User",
            email: "login@example.com",
            password: "password123",
        });

        // Then login
        const res = await request(app).post("/api/auth/login").send({
            email: "login@example.com",
            password: "password123",
        });

        if (res.statusCode !== 200) {
            console.error("Login failed response:", res.body);
        }
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty("accessToken");
    });

    it("should reject login with wrong password", async () => {
        // First signup
        await request(app).post("/api/auth/signup").send({
            fullName: "Login Fail User",
            email: "fail@example.com",
            password: "password123",
        });

        // Then login with wrong password
        const res = await request(app).post("/api/auth/login").send({
            email: "fail@example.com",
            password: "wrongpassword",
        });

        expect(res.statusCode).toEqual(400);
    });
});
