"""Preserve source section and content type on retrieved chunks."""
from alembic import op
import sqlalchemy as sa

revision = "b41c2d3e4f50"
down_revision = "f90056229329"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("content_chunks", sa.Column("chunk_metadata", sa.JSON(), nullable=False, server_default="{}"))


def downgrade():
    op.drop_column("content_chunks", "chunk_metadata")
