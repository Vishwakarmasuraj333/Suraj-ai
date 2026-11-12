import asyncio
import smtplib
from email.message import EmailMessage

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger("email_service")


class EmailNotConfiguredError(Exception):
    """Raised when real SMTP credentials are absent."""


class EmailDeliveryError(Exception):
    """Raised when SMTP transport fails to send."""


def _send_smtp_sync(
    *,
    to_email: str,
    subject: str,
    plain_body: str,
    html_body: str | None = None,
) -> None:
    settings = get_settings()
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = settings.SMTP_FROM_EMAIL
    msg["To"] = to_email
    msg.set_content(plain_body)
    if html_body:
        msg.add_alternative(html_body, subtype="html")

    host = settings.SMTP_HOST.strip()
    port = int(settings.SMTP_PORT)
    if port == 465:
        with smtplib.SMTP_SSL(host, port, timeout=15) as smtp:
            smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            smtp.send_message(msg)
    else:
        with smtplib.SMTP(host, port, timeout=15) as smtp:
            if settings.SMTP_USE_TLS:
                smtp.starttls()
            smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            smtp.send_message(msg)


async def send_email(
    *,
    to_email: str,
    subject: str,
    plain_body: str,
    html_body: str | None = None,
) -> None:
    settings = get_settings()
    if not settings.has_smtp_configured:
        raise EmailNotConfiguredError(
            "Email delivery is BLOCKED: configure SMTP_HOST, SMTP_PORT, SMTP_USER, "
            "SMTP_PASSWORD, and SMTP_FROM_EMAIL in backend/.env."
        )

    try:
        await asyncio.to_thread(
            _send_smtp_sync,
            to_email=to_email,
            subject=subject,
            plain_body=plain_body,
            html_body=html_body,
        )
        logger.info("Dispatched email (%s)", subject)
    except Exception as exc:
        logger.warning("SMTP delivery failed (%s)", type(exc).__name__)
        raise EmailDeliveryError("Failed to send email through configured SMTP server.") from exc
