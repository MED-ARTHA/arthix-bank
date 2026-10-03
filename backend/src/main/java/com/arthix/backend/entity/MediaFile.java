package com.arthix.backend.entity;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "media_files", indexes = {
    @Index(name = "idx_media_owner", columnList = "owner_id")
})
public class MediaFile {

    @Id
    @Column(length = 36)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @Column(name = "kind", nullable = false, length = 10)
    private String kind;

    @Column(name = "mime_type", nullable = false, length = 40)
    private String mimeType;

    @Column(name = "extension", nullable = false, length = 5)
    private String extension;

    @Column(name = "size_bytes", nullable = false)
    private long sizeBytes;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected MediaFile() {}

    public MediaFile(String id, User owner, String kind, String mimeType, String extension, long sizeBytes) {
        this.id = id;
        this.owner = owner;
        this.kind = kind;
        this.mimeType = mimeType;
        this.extension = extension;
        this.sizeBytes = sizeBytes;
    }

    public String getId() { return id; }
    public User getOwner() { return owner; }
    public String getKind() { return kind; }
    public String getMimeType() { return mimeType; }
    public String getExtension() { return extension; }
    public long getSizeBytes() { return sizeBytes; }
    public Instant getCreatedAt() { return createdAt; }
}