"""Resume lesson work and retain explicit answer rules."""
from alembic import op
import sqlalchemy as sa

revision = "c52d3e4f5061"
down_revision = "b41c2d3e4f50"
branch_labels = depends_on = None


def upgrade():
    op.add_column("questions", sa.Column("grading_data", sa.JSON(), nullable=False, server_default="{}"))
    op.add_column("lesson_progress", sa.Column("learning_state", sa.JSON(), nullable=False, server_default="{}"))


def downgrade():
    op.drop_column("lesson_progress", "learning_state")
    op.drop_column("questions", "grading_data")
