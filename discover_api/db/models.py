from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Text,
    BigInteger,
    Integer,
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    ARRAY,
    JSON,
    func
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class Creator(Base):
    __tablename__ = "creators"

    channel_id = Column(String(64), primary_key=True)
    name = Column(String(255), nullable=False)
    handle = Column(String(255), nullable=True)
    avatar_url = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    subscriber_count = Column(BigInteger, default=0)
    video_count = Column(Integer, default=0)
    last_synced_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    videos = relationship("Video", back_populates="creator", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_creators_subscriber_count", "subscriber_count"),
        Index("idx_creators_handle", "handle"),
        Index("idx_creators_name", "name"),
    )


class Video(Base):
    __tablename__ = "videos"

    video_id = Column(String(64), primary_key=True)
    channel_id = Column(String(64), ForeignKey("creators.channel_id", ondelete="CASCADE"), nullable=False)
    title = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    published_at = Column(DateTime(timezone=True), nullable=False)
    thumbnail_url = Column(Text, nullable=True)
    view_count = Column(BigInteger, default=0)
    like_count = Column(BigInteger, default=0)
    comment_count = Column(Integer, default=0)
    duration = Column(Integer, default=0)  # In seconds
    is_short = Column(Boolean, default=False)
    category_id = Column(String(32), nullable=True)
    live_broadcast = Column(String(32), nullable=True)
    tags = Column(ARRAY(Text), nullable=True)
    url = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    creator = relationship("Creator", back_populates="videos")

    __table_args__ = (
        Index("idx_videos_channel_id", "channel_id"),
        Index("idx_videos_published_at", published_at.desc()),
        Index("idx_videos_view_count", view_count.desc()),
        Index("idx_videos_is_short", "is_short"),
    )


class UserList(Base):
    __tablename__ = "user_lists"

    id = Column(String(64), primary_key=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    creators = relationship("ListCreator", back_populates="user_list", cascade="all, delete-orphan")


class ListCreator(Base):
    __tablename__ = "list_creators"

    list_id = Column(String(64), ForeignKey("user_lists.id", ondelete="CASCADE"), primary_key=True)
    channel_id = Column(String(64), ForeignKey("creators.channel_id", ondelete="CASCADE"), primary_key=True)

    user_list = relationship("UserList", back_populates="creators")
    creator = relationship("Creator")


class ActiveChannel(Base):
    __tablename__ = "active_channel"

    id = Column(Integer, primary_key=True, default=1)
    name = Column(String(255), nullable=False, default="Phantom Creator")
    url = Column(Text, nullable=False, default="https://youtube.com/@phantomcreator")
    profile_picture = Column(Text, nullable=True, default="")


class SentimentAnalysis(Base):
    __tablename__ = "sentiment_analyses"

    id = Column(Integer, primary_key=True, autoincrement=True)
    video_id = Column(String(64), nullable=False, index=True)
    model = Column(String(64), nullable=False)
    limit = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    report = Column(JSON, nullable=False)

