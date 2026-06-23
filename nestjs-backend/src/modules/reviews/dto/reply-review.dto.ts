import { IsString, Length } from 'class-validator';
import { SanitizeHtml } from '../../../common/decorators/sanitize-html.decorator';

export class ReplyReviewDto {
  @SanitizeHtml()
  @IsString()
  @Length(1, 500)
  text: string;
}
