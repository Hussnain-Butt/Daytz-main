"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// File: src/services/external/VimeoService.ts
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const vimeo_1 = __importDefault(require("../../vimeo")); // Corrected path assuming vimeo.ts is in config folder
class VimeoService {
    constructor() {
        this.tmpUploadDir = path_1.default.resolve('tmp_uploads');
        if (!fs_1.default.existsSync(this.tmpUploadDir)) {
            try {
                fs_1.default.mkdirSync(this.tmpUploadDir, { recursive: true });
                console.log(`VimeoService: Created temporary upload directory: ${this.tmpUploadDir}`);
            }
            catch (err) {
                console.error(`VimeoService: Failed to create temporary upload directory ${this.tmpUploadDir}:`, err);
            }
        }
        console.log(`VimeoService initialized. Temp upload directory: ${this.tmpUploadDir}`);
        if (!vimeo_1.default) {
            console.error('VimeoService FATAL: Vimeo client from config/vimeo.ts is null. Check credentials and initialization.');
        }
    }
    deleteTempFile(filePath) {
        if (!filePath)
            return;
        const resolvedFilePath = path_1.default.resolve(filePath);
        if (resolvedFilePath.startsWith(this.tmpUploadDir) && fs_1.default.existsSync(resolvedFilePath)) {
            fs_1.default.unlink(resolvedFilePath, (unlinkErr) => {
                if (unlinkErr) {
                    console.error(`VimeoService: Failed to delete temp file ${resolvedFilePath}:`, unlinkErr);
                }
                else {
                    console.log(`VimeoService: Successfully deleted temp file ${resolvedFilePath}`);
                }
            });
        }
        else if (!resolvedFilePath.startsWith(this.tmpUploadDir)) {
            console.warn(`VimeoService: Attempt to delete file outside tmp_uploads: ${resolvedFilePath}. Skipped.`);
        }
    }
    getVideoMetadata(videoUri) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!vimeo_1.default) {
                console.error('VimeoService.getVideoMetadata: Client not initialized.');
                return null;
            }
            let videoPath = videoUri;
            if (!videoUri.startsWith('/videos/')) {
                const idPart = videoUri.split('/').pop();
                if (idPart && /^\d+$/.test(idPart)) {
                    videoPath = `/videos/${idPart}`;
                }
                else {
                    console.error(`VimeoService.getVideoMetadata: Invalid videoUri format: ${videoUri}. Expected format like '/videos/ID', 'videos/ID', or 'ID'.`);
                    return null;
                }
            }
            // console.log(`VimeoService.getVideoMetadata: Fetching metadata for video path: ${videoPath}`); // Can be verbose
            return new Promise((resolve) => {
                const callback = (error, body, statusCode) => {
                    // Original check from before adding explicit Accept header:
                    if (error || statusCode >= 400) {
                        console.error(`VimeoService.getVideoMetadata: Error for ${videoPath}. Status: ${statusCode}, Error: ${error ? error.message : 'N/A'}. Body:`, 
                        // Log body for more context on error
                        typeof body === 'object' ? JSON.stringify(body, null, 2) : body);
                        return resolve(null);
                    }
                    // Added robustness check for body type
                    if (typeof body !== 'object' || body === null) {
                        console.error(`VimeoService.getVideoMetadata: Invalid body received for ${videoPath}. Expected object, got:`, body);
                        return resolve(null);
                    }
                    resolve(body);
                };
                const fields = 'uri,link,play,files,transcode.status,upload.status,name,duration,privacy';
                // Original client.request call without explicit headers object:
                vimeo_1.default.request({ method: 'GET', path: `${videoPath}?fields=${fields}` }, callback);
            });
        });
    }
    getPlayableMp4Url(playData) {
        if (!(playData === null || playData === void 0 ? void 0 : playData.progressive) || playData.progressive.length === 0) {
            return null;
        }
        const hd = playData.progressive.find((f) => f.quality === '1080p' && f.link && f.type === 'video/mp4') ||
            playData.progressive.find((f) => f.quality === 'hd' && f.link && f.type === 'video/mp4');
        const sd = playData.progressive.find((f) => f.quality === 'sd' && f.link && f.type === 'video/mp4') ||
            playData.progressive.find((f) => f.quality === '720p' && f.link && f.type === 'video/mp4') ||
            playData.progressive.find((f) => f.quality === '540p' && f.link && f.type === 'video/mp4');
        const anyProg = playData.progressive.find((f) => f.link && f.type === 'video/mp4'); // Catch-all for any MP4
        const chosenLink = (hd === null || hd === void 0 ? void 0 : hd.link) || (sd === null || sd === void 0 ? void 0 : sd.link) || (anyProg === null || anyProg === void 0 ? void 0 : anyProg.link) || null;
        if (chosenLink) {
            // console.log(`VimeoService.getPlayableMp4Url: Found MP4 link (Quality HD: ${!!hd}, SD: ${!!sd}, Any: ${!!anyProg}): ${chosenLink.substring(0, 50)}...`);
        }
        else {
            // console.log('VimeoService.getPlayableMp4Url: No suitable progressive MP4 link found.');
        }
        return chosenLink;
    }
    getPlayableHlsUrl(playData) {
        var _a;
        if (((_a = playData === null || playData === void 0 ? void 0 : playData.hls) === null || _a === void 0 ? void 0 : _a.link) &&
            (playData.hls.type === 'application/x-mpegURL' || !playData.hls.type)) {
            // console.log(`VimeoService.getPlayableHlsUrl: Found HLS link: ${playData.hls.link.substring(0,50)}...`);
            return playData.hls.link;
        }
        // console.log('VimeoService.getPlayableHlsUrl: No suitable HLS link found.');
        return null;
    }
    getBestFileLink_Legacy(files) {
        if (!files || files.length === 0) {
            return null;
        }
        const hd = files.find((f) => f.quality === 'hd' && f.type === 'video/mp4' && f.link);
        const sd = files.find((f) => f.quality === 'sd' && f.type === 'video/mp4' && f.link);
        const anyMp4 = files.find((f) => f.type === 'video/mp4' && f.link);
        const chosenLink = (hd === null || hd === void 0 ? void 0 : hd.link) || (sd === null || sd === void 0 ? void 0 : sd.link) || (anyMp4 === null || anyMp4 === void 0 ? void 0 : anyMp4.link) || null;
        if (chosenLink) {
            // console.log(`VimeoService.getBestFileLink_Legacy: Found MP4 link from files (Quality HD: ${!!hd}, SD: ${!!sd}, Any: ${!!anyMp4}): ${chosenLink.substring(0, 50)}...`);
        }
        else {
            // console.log('VimeoService.getBestFileLink_Legacy: No suitable MP4 link found in files array.');
        }
        return chosenLink;
    }
    getFreshPlayableUrl(videoUri) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g;
            console.log(`VimeoService.getFreshPlayableUrl: Received video URI: '${videoUri}' for processing.`);
            if (!videoUri || typeof videoUri !== 'string' || videoUri.trim() === '') {
                console.error('VimeoService.getFreshPlayableUrl: Input video URI is null, empty, or not a string.');
                return null;
            }
            let normalizedUri = videoUri.trim();
            if (normalizedUri.startsWith('/videos/')) {
                const idPart = normalizedUri.substring('/videos/'.length);
                if (!/^\d+$/.test(idPart)) {
                    console.error(`VimeoService.getFreshPlayableUrl: Invalid ID part in pre-formatted URI '${normalizedUri}'.`);
                    return null;
                }
            }
            else if (normalizedUri.startsWith('videos/')) {
                const idPart = normalizedUri.substring('videos/'.length);
                if (/^\d+$/.test(idPart)) {
                    normalizedUri = `/videos/${idPart}`;
                }
                else {
                    console.error(`VimeoService.getFreshPlayableUrl: Invalid ID part in 'videos/...' formatted URI '${videoUri}'.`);
                    return null;
                }
            }
            else if (/^\d+$/.test(normalizedUri)) {
                normalizedUri = `/videos/${normalizedUri}`;
            }
            else {
                console.error(`VimeoService.getFreshPlayableUrl: Unrecognized video URI format: '${videoUri}'. Could not normalize.`);
                return null;
            }
            console.log(`VimeoService.getFreshPlayableUrl: Normalized URI to: '${normalizedUri}'`);
            const metadata = yield this.getVideoMetadata(normalizedUri);
            if (!metadata) {
                console.warn(`VimeoService.getFreshPlayableUrl: No metadata found for normalized URI ${normalizedUri} (original: ${videoUri}).`);
                return null;
            }
            // --- CRITICAL LOGGING (Keep this for debugging) ---
            console.log(`VimeoService.getFreshPlayableUrl: Metadata received for ${normalizedUri}:`);
            console.log(`  Upload Status: ${(_a = metadata.upload) === null || _a === void 0 ? void 0 : _a.status}`);
            console.log(`  Transcode Status: ${(_b = metadata.transcode) === null || _b === void 0 ? void 0 : _b.status}`);
            console.log(`  Play Object (metadata.play):`, JSON.stringify(metadata.play, null, 2));
            // Log files object only if play.progressive is missing or empty, or if no URL is found from play
            let logFilesObject = !((_c = metadata.play) === null || _c === void 0 ? void 0 : _c.progressive) || metadata.play.progressive.length === 0;
            // --- END CRITICAL LOGGING ---
            if (((_d = metadata.upload) === null || _d === void 0 ? void 0 : _d.status) !== 'complete') {
                console.log(`VimeoService.getFreshPlayableUrl: Video ${normalizedUri} upload not complete (status: ${(_e = metadata.upload) === null || _e === void 0 ? void 0 : _e.status})`);
                return null;
            }
            if (((_f = metadata.transcode) === null || _f === void 0 ? void 0 : _f.status) !== 'complete') {
                console.log(`VimeoService.getFreshPlayableUrl: Video ${normalizedUri} not yet transcoded (status: ${(_g = metadata.transcode) === null || _g === void 0 ? void 0 : _g.status})`);
                return null;
            }
            let playableUrl = null;
            // 1. Try Progressive MP4 from 'play'
            playableUrl = this.getPlayableMp4Url(metadata.play);
            if (playableUrl) {
                console.log(`VimeoService.getFreshPlayableUrl: Success - Found Progressive MP4 URL from 'play' data for ${normalizedUri}.`);
                return playableUrl;
            }
            console.log(`VimeoService.getFreshPlayableUrl: Info - No Progressive MP4 URL found in 'play.progressive' for ${normalizedUri}.`);
            logFilesObject = true; // Since MP4 from play.progressive failed, ensure files object is logged
            // 2. Try HLS from 'play' (if your player supports HLS)
            playableUrl = this.getPlayableHlsUrl(metadata.play);
            if (playableUrl) {
                console.log(`VimeoService.getFreshPlayableUrl: Success - Found HLS URL from 'play.hls' for ${normalizedUri}.`);
                return playableUrl; // This will be an .m3u8 link
            }
            console.log(`VimeoService.getFreshPlayableUrl: Info - No HLS URL found in 'play.hls' for ${normalizedUri}.`);
            logFilesObject = true; // Since HLS also failed, ensure files object is logged
            // Log files object if it hasn't been logged and we haven't found a URL yet
            if (logFilesObject) {
                console.log(`  Files Object (metadata.files):`, JSON.stringify(metadata.files, null, 2));
            }
            // 3. Try legacy 'files' array (usually for MP4s)
            playableUrl = this.getBestFileLink_Legacy(metadata.files);
            if (playableUrl) {
                console.log(`VimeoService.getFreshPlayableUrl: Success - Found MP4 URL from 'files' data (legacy) for ${normalizedUri}.`);
                return playableUrl;
            }
            console.log(`VimeoService.getFreshPlayableUrl: Info - No MP4 URL found in 'files' data (legacy) for ${normalizedUri}.`);
            console.error(
            // Final error if nothing is found
            `VimeoService.getFreshPlayableUrl: FAILURE - No playable URL (MP4, HLS, or legacy MP4) found for ${normalizedUri}.`);
            return null;
        });
    }
    uploadVideo(filePath_1) {
        return __awaiter(this, arguments, void 0, function* (filePath, videoName = 'Daytz App Upload') {
            if (!vimeo_1.default) {
                console.error('VimeoService.uploadVideo: Client not initialized.');
                throw new Error('Vimeo client not configured.');
            }
            console.log(`VimeoService.uploadVideo: Uploading "${filePath}" as "${videoName}"`);
            const params = {
                name: videoName,
                privacy: {
                    view: 'unlisted',
                    embed: 'public',
                    download: false,
                },
            };
            return new Promise((resolve, reject) => {
                let initiatedVideoUri = null;
                vimeo_1.default.upload(filePath, params, (uri) => {
                    console.log(`VimeoService.uploadVideo: Upload initiated. Video API URI: ${uri}`);
                    initiatedVideoUri = uri;
                    vimeo_1.default.request({ method: 'GET', path: `${uri}?fields=link,upload.status,transcode.status` }, (err, body, status) => {
                        var _a, _b;
                        if (err || status >= 400 || !(body === null || body === void 0 ? void 0 : body.link)) {
                            console.warn(`VimeoService.uploadVideo: Could not fetch page link or verify status for ${uri} post-initiation. Status: ${status}. Error: ${err ? err.message : 'N/A'}. Body: ${JSON.stringify(body)}`);
                            const videoId = initiatedVideoUri === null || initiatedVideoUri === void 0 ? void 0 : initiatedVideoUri.split('/').pop();
                            const fallbackPageLink = videoId
                                ? `https://vimeo.com/${videoId}`
                                : `https://vimeo.com${initiatedVideoUri || ''}`;
                            console.warn(`VimeoService.uploadVideo: Using fallback pageLink: ${fallbackPageLink}`);
                            if (initiatedVideoUri) {
                                resolve({ uri: initiatedVideoUri, pageLink: fallbackPageLink });
                            }
                            else {
                                reject(new Error('Vimeo upload initiated but failed to retrieve URI or page link.'));
                            }
                            return;
                        }
                        console.log(`VimeoService.uploadVideo: Fetched page link: ${body.link}. Upload: ${(_a = body.upload) === null || _a === void 0 ? void 0 : _a.status}, Transcode: ${(_b = body.transcode) === null || _b === void 0 ? void 0 : _b.status}`);
                        if (initiatedVideoUri) {
                            resolve({ uri: initiatedVideoUri, pageLink: body.link });
                        }
                        else {
                            reject(new Error('Vimeo upload initiated but URI became null before final resolution.'));
                        }
                    });
                }, (_bytes_uploaded, _bytes_total) => {
                    /* Progress callback */
                }, (error) => {
                    console.error(`VimeoService.uploadVideo: Failed to initiate video upload. Error:`, error.message);
                    reject(new Error(`Vimeo upload initiation failed: ${error.message}`));
                });
            }).finally(() => {
                this.deleteTempFile(filePath);
            });
        });
    }
    replaceVideoSource(filePath, videoUri) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!vimeo_1.default) {
                console.error('VimeoService.replaceVideoSource: Client not initialized.');
                throw new Error('Vimeo client not configured.');
            }
            let fullVideoPath = videoUri;
            if (!videoUri.startsWith('/videos/')) {
                const idPart = videoUri.split('/').pop();
                if (idPart && /^\d+$/.test(idPart))
                    fullVideoPath = `/videos/${idPart}`;
                else
                    throw new Error(`Invalid videoUri format for replacement: ${videoUri}`);
            }
            console.log(`VimeoService.replaceVideoSource: Replacing source for ${fullVideoPath} with file ${filePath}`);
            return new Promise((resolve, reject) => {
                vimeo_1.default.replace(filePath, fullVideoPath, (uploadCompleteUri) => {
                    console.log(`VimeoService.replaceVideoSource: Replacement upload complete. Vimeo reported URI: ${uploadCompleteUri}. Original Video URI: ${fullVideoPath}`);
                    vimeo_1.default.request({ method: 'GET', path: `${fullVideoPath}?fields=link` }, (err, body, status) => {
                        let pageLink = '';
                        if (err || status >= 400 || !(body === null || body === void 0 ? void 0 : body.link)) {
                            console.warn(`VimeoService.replaceVideoSource: Could not fetch page link for ${fullVideoPath} after replace. Status: ${status}. Error: ${err ? err.message : 'N/A'}. Body: ${JSON.stringify(body)}. Falling back.`);
                            const videoId = fullVideoPath.split('/').pop();
                            pageLink = videoId
                                ? `https://vimeo.com/${videoId}`
                                : `https://vimeo.com${fullVideoPath}`;
                        }
                        else {
                            pageLink = body.link;
                            console.log(`VimeoService.replaceVideoSource: Fetched page link for replaced video: ${pageLink}`);
                        }
                        resolve({ uri: fullVideoPath, pageLink: pageLink });
                    });
                }, (_bytes_uploaded, _bytes_total) => {
                    /* Progress */
                }, (error) => {
                    console.error(`VimeoService.replaceVideoSource: Failed replacement for ${fullVideoPath}. Error:`, error.message);
                    reject(new Error(`Vimeo replacement initiation failed: ${error.message}`));
                });
            }).finally(() => {
                this.deleteTempFile(filePath);
            });
        });
    }
    deleteVideo(videoUriOrId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!vimeo_1.default) {
                console.error('VimeoService.deleteVideo: Client not initialized.');
                throw new Error('Vimeo client not configured.');
            }
            const videoId = videoUriOrId.split('/').pop();
            if (!videoId || !/^\d+$/.test(videoId)) {
                const errMsg = `Invalid video URI/ID for deletion: ${videoUriOrId}`;
                console.error(`VimeoService.deleteVideo: ${errMsg}`);
                throw new Error(errMsg);
            }
            const videoPath = `/videos/${videoId}`;
            console.log(`VimeoService.deleteVideo: Attempting to delete video: ${videoPath}`);
            return new Promise((resolve, reject) => {
                const callback = (error, body, statusCode) => {
                    if (error || (statusCode >= 400 && statusCode !== 404)) {
                        console.error(`VimeoService.deleteVideo: Failed for ${videoPath}. Status: ${statusCode}.`, error || body);
                        reject(error || new Error(`Vimeo API Error during delete: Status ${statusCode}`));
                    }
                    else {
                        console.log(`VimeoService.deleteVideo: ${videoPath} deletion successful or not found (Status: ${statusCode}).`);
                        resolve();
                    }
                };
                vimeo_1.default.request({ method: 'DELETE', path: videoPath }, callback);
            });
        });
    }
}
exports.default = VimeoService;
