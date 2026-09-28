import { Router } from 'express';
import {
  loginSchema,
  registerSchema,
  resendOtpSchema,
  verifyEmailSchema,
} from '../schemas/auth.schemas';
import { parse } from '../middleware/validate';
import type { AuthService } from '../services/auth.service';

export function authRoutes(auth: AuthService): Router {
  const router = Router();

  router.post('/register', async (req, res) => {
    const { email, password } = parse(registerSchema, req.body);
    res.status(201).json(await auth.register(email, password));
  });

  router.post('/verify-email', async (req, res) => {
    const { email, code } = parse(verifyEmailSchema, req.body);
    res.json({ ...(await auth.verifyEmail(email, code)), verified: true });
  });

  router.post('/resend-otp', async (req, res) => {
    const { email } = parse(resendOtpSchema, req.body);
    res.json(await auth.resendOtp(email));
  });

  router.post('/login', async (req, res) => {
    const { email, password } = parse(loginSchema, req.body);
    res.json(await auth.login(email, password));
  });

  return router;
}
