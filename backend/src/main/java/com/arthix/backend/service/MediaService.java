package com.arthix.backend.service;

import com.arthix.backend.entity.MediaFile;
import com.arthix.backend.entity.User;
import com.arthix.backend.repository.MediaRepository;
import com.arthix.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;
import java.util.regex.Pattern;

/** Stores uploaded photos and videos on disk. The type is detected from the file content, never from its name. */
@Service
public class MediaService {

    public record Stored(String id, String type, String url) {}
    public record Served(Path path, String mime) {}
    private record Sniffed(String kind, String mime, String ext) {}

    private static final long MB = 1024L * 1024L;
    private static final Pattern ID =
        Pattern.compile("^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$");

    private final Path dir;
    private final MediaRepository media;
    private final UserRepository users;

    public MediaService(@Value("${app.media.dir:uploads}") String dir, MediaRepository media, UserRepository users) {
        this.dir = Path.of(dir).toAbsolutePath().normalize();
        this.media = media;
        this.users = users;
        try {
            Files.createDirectories(this.dir);
        } catch (IOException e) {
            throw new IllegalStateException("Cannot create media directory " + this.dir, e);
        }
    }

    public static String urlOf(MediaFile f) {
        return "/api/media/" + f.getId();
    }

    @Transactional
    public Stored store(String email, MultipartFile file, boolean avatar) {
        User owner = users.findByEmail(email).orElseThrow();
        if (file == null || file.isEmpty()) throw bad("No file received");

        byte[] head;
        try (InputStream in = file.getInputStream()) {
            head = in.readNBytes(16);
        } catch (IOException e) {
            throw bad("Could not read the file");
        }

        Sniffed s = sniff(head);
        if (s == null) throw bad("Unsupported file. Use JPEG, PNG, GIF, WebP, MP4, MOV or WebM.");
        if (avatar && !"image".equals(s.kind())) throw bad("Please choose an image");

        long max = avatar ? 5 * MB : "image".equals(s.kind()) ? 10 * MB : 25 * MB;
        if (file.getSize() > max) throw bad("File is too large (max " + (max / MB) + " MB)");

        String id = UUID.randomUUID().toString();
        Path target = dir.resolve(id + "." + s.ext());
        try (InputStream in = file.getInputStream()) {
            Files.copy(in, target);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not save the file");
        }

        MediaFile saved = media.save(new MediaFile(id, owner, s.kind(), s.mime(), s.ext(), file.getSize()));
        return new Stored(saved.getId(), saved.getKind(), urlOf(saved));
    }

    /** The attachment must exist and belong to the user who is sending it. */
    @Transactional(readOnly = true)
    public MediaFile requireOwned(User owner, String mediaId) {
        if (mediaId == null || !ID.matcher(mediaId).matches()) throw bad("Invalid attachment");
        MediaFile f = media.findById(mediaId).orElseThrow(() -> bad("Invalid attachment"));
        if (!f.getOwner().getId().equals(owner.getId())) throw bad("Invalid attachment");
        return f;
    }

    @Transactional(readOnly = true)
    public Served serve(String id) {
        if (id == null || !ID.matcher(id).matches()) throw notFound();
        MediaFile f = media.findById(id).orElseThrow(MediaService::notFound);
        Path p = dir.resolve(f.getId() + "." + f.getExtension());
        if (!Files.isRegularFile(p)) throw notFound();
        return new Served(p, f.getMimeType());
    }

    private static Sniffed sniff(byte[] b) {
        if (b.length < 12) return null;
        if ((b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8 && (b[2] & 0xFF) == 0xFF) {
            return new Sniffed("image", "image/jpeg", "jpg");
        }
        if ((b[0] & 0xFF) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G') {
            return new Sniffed("image", "image/png", "png");
        }
        if (b[0] == 'G' && b[1] == 'I' && b[2] == 'F' && b[3] == '8') {
            return new Sniffed("image", "image/gif", "gif");
        }
        if (b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F'
            && b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P') {
            return new Sniffed("image", "image/webp", "webp");
        }
        if (b[4] == 'f' && b[5] == 't' && b[6] == 'y' && b[7] == 'p') {
            String brand = new String(b, 8, 4, StandardCharsets.US_ASCII);
            if (brand.startsWith("qt")) return new Sniffed("video", "video/quicktime", "mov");
            if (brand.startsWith("hei") || brand.startsWith("hev") || brand.startsWith("mif") || brand.startsWith("msf")) {
                return null; // HEIC photos are not displayable in most browsers
            }
            return new Sniffed("video", "video/mp4", "mp4");
        }
        if ((b[0] & 0xFF) == 0x1A && (b[1] & 0xFF) == 0x45 && (b[2] & 0xFF) == 0xDF && (b[3] & 0xFF) == 0xA3) {
            return new Sniffed("video", "video/webm", "webm");
        }
        return null;
    }

    private static ResponseStatusException bad(String msg) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, msg);
    }

    private static ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "File not found");
    }
}