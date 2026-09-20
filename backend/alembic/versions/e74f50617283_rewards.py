"""Account reward ledger and verified study time."""
from alembic import op
import sqlalchemy as sa

revision = "e74f50617283"
down_revision = "d63e4f506172"
branch_labels = depends_on = None


def upgrade():
    op.create_table("reward_accounts",
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), primary_key=True),
        sa.Column("points", sa.Integer(), nullable=False),
        sa.Column("correct_streak", sa.Integer(), nullable=False),
        sa.Column("study_ms", sa.BigInteger(), nullable=False),
        sa.Column("last_pulse", sa.DateTime(timezone=True), nullable=True))
    op.create_table("reward_events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("source", sa.String(160), nullable=False),
        sa.Column("kind", sa.String(30), nullable=False),
        sa.Column("points", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("user_id", "source", name="uq_reward_source"))
    op.create_index("ix_reward_events_user_id", "reward_events", ["user_id"])


def downgrade():
    op.drop_table("reward_events")
    op.drop_table("reward_accounts")
