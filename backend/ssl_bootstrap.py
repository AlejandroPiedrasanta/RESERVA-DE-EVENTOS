"""SSL bootstrap — genera un certificado autofirmado (self-signed) para el
servidor local del EXE en el primer arranque, y lo cachea en el directorio
de datos del usuario.

Diseño:

  * El EXE se ejecuta en `localhost:8001`. HTTP en claro está bien para 99%
    de escenarios, pero algunos entornos corporativos / navegadores modernos
    (Chrome, Edge) marcan «Not secure» y bloquean features como el
    Clipboard API, WebAuthn o Service Workers.
  * Solución: generar UNA VEZ un cert RSA-2048 autofirmado con CN=localhost
    y SAN=[localhost, 127.0.0.1, ::1], guardarlo en el AppData del usuario,
    y arrancar uvicorn con `ssl_certfile` + `ssl_keyfile`.
  * Validez: 10 años. Si el par cert/key ya existe y no está caducado, se
    reutiliza (sin regenerar en cada arranque).
  * NO requiere instalar el cert en el trust store: seguirá saliendo el
    warning del navegador la primera vez, pero la conexión ES cifrada
    end-to-end (TLS 1.2/1.3), que es lo que el usuario pidió.

API:

    from ssl_bootstrap import ensure_local_certificate

    cert_file, key_file = ensure_local_certificate()
    uvicorn.Config(app, host="0.0.0.0", port=8001,
                   ssl_certfile=str(cert_file),
                   ssl_keyfile=str(key_file))
"""

from __future__ import annotations

import ipaddress
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Tuple


def _cert_dir() -> Path:
    """Directorio persistente para guardar el par cert/key.

    En Windows: %LOCALAPPDATA%\\CinemaProductions\\ssl
    En macOS:   ~/Library/Application Support/CinemaProductions/ssl
    En Linux:   ~/.local/share/CinemaProductions/ssl
    """
    if sys.platform == "win32":
        base = Path(os.environ.get("LOCALAPPDATA") or Path.home() / "AppData" / "Local")
    elif sys.platform == "darwin":
        base = Path.home() / "Library" / "Application Support"
    else:
        base = Path(os.environ.get("XDG_DATA_HOME") or Path.home() / ".local" / "share")
    d = base / "CinemaProductions" / "ssl"
    d.mkdir(parents=True, exist_ok=True)
    return d


def _generate(cert_path: Path, key_path: Path) -> None:
    """Genera un par cert/key RSA-2048 autofirmado con SAN=localhost."""
    # Importaciones locales — cryptography ya está en requirements.txt.
    from cryptography import x509
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import rsa
    from cryptography.x509.oid import NameOID

    # 1) Clave privada RSA-2048.
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)

    # 2) Nombre del sujeto y emisor (idénticos — self-signed).
    subject = issuer = x509.Name([
        x509.NameAttribute(NameOID.COUNTRY_NAME, "US"),
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, "Cinema Productions"),
        x509.NameAttribute(NameOID.COMMON_NAME, "localhost"),
    ])

    # 3) SAN — indispensable en navegadores modernos (Chrome ignora CN).
    san = x509.SubjectAlternativeName([
        x509.DNSName("localhost"),
        x509.DNSName("127.0.0.1"),
        x509.IPAddress(ipaddress.IPv4Address("127.0.0.1")),
        x509.IPAddress(ipaddress.IPv6Address("::1")),
    ])

    now = datetime.now(timezone.utc)
    cert = (
        x509.CertificateBuilder()
        .subject_name(subject)
        .issuer_name(issuer)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - timedelta(minutes=5))
        .not_valid_after(now + timedelta(days=3650))  # 10 años
        .add_extension(san, critical=False)
        .add_extension(x509.BasicConstraints(ca=False, path_length=None), critical=True)
        .add_extension(
            x509.KeyUsage(
                digital_signature=True, key_encipherment=True,
                content_commitment=False, data_encipherment=False,
                key_agreement=False, key_cert_sign=False, crl_sign=False,
                encipher_only=False, decipher_only=False,
            ),
            critical=True,
        )
        .add_extension(
            x509.ExtendedKeyUsage([x509.ExtendedKeyUsageOID.SERVER_AUTH]),
            critical=False,
        )
        .sign(private_key=key, algorithm=hashes.SHA256())
    )

    # 4) Escribir en disco (PEM).
    cert_path.write_bytes(cert.public_bytes(serialization.Encoding.PEM))
    key_path.write_bytes(
        key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.TraditionalOpenSSL,
            encryption_algorithm=serialization.NoEncryption(),
        )
    )
    # Permisos restrictivos para la clave privada (best-effort en POSIX).
    try:
        os.chmod(key_path, 0o600)
    except Exception:
        pass


def _is_valid(cert_path: Path) -> bool:
    """True si el cert existe y NO caduca en los próximos 30 días."""
    if not cert_path.exists() or cert_path.stat().st_size == 0:
        return False
    try:
        from cryptography import x509
        cert = x509.load_pem_x509_certificate(cert_path.read_bytes())
        not_after = cert.not_valid_after_utc if hasattr(cert, "not_valid_after_utc") else cert.not_valid_after
        if not_after.tzinfo is None:
            not_after = not_after.replace(tzinfo=timezone.utc)
        return not_after > datetime.now(timezone.utc) + timedelta(days=30)
    except Exception:
        return False


def ensure_local_certificate() -> Tuple[Path, Path]:
    """Devuelve `(cert_path, key_path)`, generando el par si es necesario.

    Idempotente: en llamadas siguientes reutiliza los archivos ya cacheados.
    """
    d = _cert_dir()
    cert_path = d / "cert.pem"
    key_path = d / "key.pem"

    if _is_valid(cert_path) and key_path.exists() and key_path.stat().st_size > 0:
        return cert_path, key_path

    # Regenerar (primer arranque o cert caducado).
    _generate(cert_path, key_path)
    return cert_path, key_path


if __name__ == "__main__":
    cp, kp = ensure_local_certificate()
    print(f"cert: {cp}")
    print(f"key:  {kp}")
