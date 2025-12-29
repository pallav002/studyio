import logging
import random
import traceback
from typing import Optional
from datetime import datetime
from email.message import EmailMessage
import aiosmtplib
from app.core.config import settings

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        self.host = settings.SMTP_HOST
        self.port = settings.SMTP_PORT
        self.user = settings.SMTP_USER
        self.password = settings.SMTP_PASS
        self.sender = settings.SMTP_FROM
        
        # Validation on startup/init
        if not all([self.host, self.user, self.password]):
            logger.error("!!! SMTP CONFIGURATION MISSING !!!")
            logger.error(f"Host: {self.host}, User: {self.user}, Pass: {'****' if self.password else 'MISSING'}")
        else:
            logger.info("Email service initialized with SMTP.")

    async def verify_connection(self):
        if not all([self.host, self.user, self.password]):
            return False
        try:
            async with aiosmtplib.SMTP(
                hostname=self.host,
                port=self.port,
                use_tls=(self.port == 465),
                start_tls=(self.port == 587),
            ) as smtp:
                await smtp.login(self.user, self.password)
                logger.info("SMTP Connection Verified successfully.")
                return True
        except Exception as e:
            logger.error(f"SMTP Verification Failed: {str(e)}")
            return False

    async def _send_email(self, recipient: str, subject: str, html_content: str):
        if not all([self.host, self.user, self.password]):
            logger.warning(f"SMTP not configured. Skipping email to {recipient}. Subject: {subject}")
            return False

        message = EmailMessage()
        message["From"] = self.sender
        message["To"] = recipient
        message["Subject"] = subject
        message.set_content("Please use an HTML capable email client to view this message.")
        message.add_alternative(html_content, subtype="html")

        try:
            print(f"Sending OTP to: {recipient}")
            logger.info("Attempting to send OTP email...")
            await aiosmtplib.send(
                message,
                hostname=self.host,
                port=self.port,
                username=self.user,
                password=self.password,
                use_tls=(self.port == 465),
                start_tls=(self.port == 587),
            )
            logger.info("OTP email sent successfully")
            return True
        except Exception as e:
            logger.error(f"FAILED TO SEND EMAIL TO {recipient}")
            logger.error(f"Error: {str(e)}")
            logger.error(traceback.format_exc())
            return False

    async def send_otp_email(self, email: str, otp: str, first_name: str = "Student"):
        print(f"OTP GENERATED: {otp}")
        logger.info(f"OTP generated for email: {email}")
        
        subject = "Verify your Study.io account"
        html_content = f"""
        <html>
            <body style="font-family: sans-serif; color: #333; line-height: 1.6;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; borderRadius: 10px;">
                    <h2 style="color: #6366f1;">Welcome to Study.io!</h2>
                    <p>Hi {first_name},</p>
                    <p>Thank you for signing up. To complete your registration, please use the following 6-digit verification code:</p>
                    
                    <div style="background: #f4f4f9; padding: 20px; text-align: center; border-radius: 8px; margin: 25px 0;">
                        <span style="font-size: 32px; font-weight: bold; letter-spacing: 12px; color: #6366f1;">{otp}</span>
                    </div>
                    
                    <p style="font-size: 14px; color: #666;">This code will expire in 10 minutes for your security.</p>
                    <p>If you didn't request this code, you can safely ignore this email.</p>
                    
                    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
                    <p style="font-size: 12px; color: #999; text-align: center;">
                        Study.io – Smart Learning Platform
                    </p>
                </div>
            </body>
        </html>
        """
        return await self._send_email(email, subject, html_content)

    async def send_welcome_email(self, email: str, name: str = "Student"):
        subject = "Welcome to Study.io - Your Premium Learning Journey Begins!"
        html_content = f"""
        <html>
            <body style="font-family: sans-serif; color: #333; line-height: 1.6;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; borderRadius: 10px;">
                    <h2 style="color: #10b981;">Hi {name},</h2>
                    <p>Welcome to <strong>Study.io</strong>! We're excited to have you on board.</p>
                    <p>Your account is now verified, and you're ready to explore a premium learning experience.</p>
                    <p>Transform your notes into engaging audio study guides and master any topic with our AI-powered tutor.</p>
                    
                    <div style="margin: 30px 0; text-align: center;">
                        <a href="http://localhost:5173/dashboard" style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Start Learning Now</a>
                    </div>
                    
                    <p>Happy studying!</p>
                    <p>The Study.io Team</p>
                    
                    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
                    <p style="font-size: 12px; color: #999; text-align: center;">
                        Study.io – Smart Learning Platform
                    </p>
                </div>
            </body>
        </html>
        """
        return await self._send_email(email, subject, html_content)

def generate_otp() -> str:
    return "".join([str(random.randint(0, 9)) for _ in range(6)])

email_service = EmailService()
