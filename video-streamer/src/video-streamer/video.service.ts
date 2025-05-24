import { Injectable } from '@nestjs/common';
import { createReadStream, existsSync, statSync } from 'fs';
import { join } from 'path';

@Injectable()
export class VideoService {
  private readonly videoPath = join(process.cwd(), 'videos', 'sample.mp4');

  getVideoStream(range?: string) {
    if (!existsSync(this.videoPath)) {
      throw new Error(`Video file not found at path: ${this.videoPath}`);
    }

    const videoSize = statSync(this.videoPath).size;

    let start = 0;
    let end = videoSize - 1;
    let status = 200;
    const headers: Record<string, any> = {
      'Content-Type': 'video/mp4',
      'Accept-Ranges': 'bytes',
    };

    if (range) {
      const match = /bytes=(\d+)-(\d*)/.exec(range);
      if (match) {
        start = parseInt(match[1], 10);
        end = match[2] ? parseInt(match[2], 10) : end;
        if (end >= videoSize) end = videoSize - 1;
        status = 206;
        headers['Content-Range'] = `bytes ${start}-${end}/${videoSize}`;
        headers['Content-Length'] = end - start + 1;
      }
    } else {
      headers['Content-Length'] = videoSize;
    }

    const stream = createReadStream(this.videoPath, { start, end });
    return { stream, headers, status };
  }
}
