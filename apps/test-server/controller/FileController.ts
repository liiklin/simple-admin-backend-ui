import FileService from '../service/FileService';

class FileController {
  private service: FileService = new FileService();

  upload = async (ctx) => {
    const files = ctx.request.files.file;
    console.log(files);

    if (files.length === undefined) {
      await this.service.upload(ctx, files, false);
    } else {
      await this.service.upload(ctx, files, true);
    }
  };
}

export default new FileController();
