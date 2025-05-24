import { Controller, Get, Req, Res } from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { VideoService } from './video.service';
import { ApiResponse } from '@nestjs/swagger';
import * as path from 'node:path';
import * as fs from 'node:fs';

@Controller('video')
export class VideoController {
  constructor(private readonly videoService: VideoService) {}

  @Get('test_stream')
  async teststreamVideo(
    @Req() req: FastifyRequest,
    @Res({ passthrough: false }) reply: FastifyReply,
  ) {
    const filePath = path.join(__dirname, '..', '..', 'videos', 'sample.mp4');
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (!range) {
      reply
        .code(416)
        .header('Content-Type', 'text/plain')
        .send('Range header required');
      return;
    }

    const CHUNK_SIZE = 1024 * 1024; // 1MB

    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    // const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    // const chunkSize = end - start + 1;

    // const start = parseInt(startStr, 10);
    const end = Math.min(start + CHUNK_SIZE - 1, fileSize - 1);
    const contentLength = end - start + 1;
    const stream = fs.createReadStream(filePath, { start, end });

    reply
      .code(206)
      .header('Content-Range', `bytes ${start}-${end}/${fileSize}`)
      .header('Accept-Ranges', 'bytes')
      .header('Content-Length', contentLength.toString())
      .header('Content-Type', 'application/octet-stream');

    return reply.send(stream);
  }
}
