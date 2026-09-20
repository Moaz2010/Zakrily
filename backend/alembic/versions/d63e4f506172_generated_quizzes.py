"""Persist generated quizzes, their three attempt slots, and skill practice."""
from alembic import op
import sqlalchemy as sa

revision = "d63e4f506172"
down_revision = "c52d3e4f5061"
branch_labels = depends_on = None


def upgrade():
    op.create_table(
        "generated_quizzes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("lesson_id", sa.Integer(), sa.ForeignKey("lessons.id"), nullable=False),
        sa.Column("slot", sa.String(100), nullable=False),
        sa.Column("skill", sa.String(30), nullable=True),
        sa.Column("question_ids", sa.JSON(), nullable=False),
        sa.Column("result", sa.JSON(none_as_null=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("user_id", "lesson_id", "slot", name="uq_generated_quiz_slot"),
    )
    op.create_index("ix_generated_quizzes_user_id", "generated_quizzes", ["user_id"])
    op.create_index("ix_generated_quizzes_lesson_id", "generated_quizzes", ["lesson_id"])


def downgrade():
    op.drop_table("generated_quizzes")
