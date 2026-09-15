import uuid

from supabase import Client, create_client

from app.core.config import settings

_client: Client | None = None


def get_supabase() -> Client:
    global _client
    if _client is None:
        _client = create_client(settings.supabase_url, settings.supabase_service_role_key)
    return _client


def upload_math_image(image_bytes: bytes, content_type: str = "image/jpeg") -> str:
    """Upload a math submission photo to Supabase Storage and return its public URL."""
    path = f"{uuid.uuid4()}.jpg"
    client = get_supabase()
    client.storage.from_(settings.supabase_storage_bucket).upload(
        path, image_bytes, {"content-type": content_type}
    )
    return client.storage.from_(settings.supabase_storage_bucket).get_public_url(path)
