import { Type } from 'class-transformer';
import {
  IsArray,
  IsDefined,
  IsIn,
  IsNumber,
  IsString,
  Max,
  Min,
  ValidateNested,
  IsOptional,
} from 'class-validator';

export class Collaborators {
  @IsDefined()
  @IsString()
  label: string;
}

export class InstagramAudio {
  @IsDefined()
  @IsString()
  id: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  artist?: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  audio_volume?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  video_volume?: number;
}
/**
 * Uma pessoa marcada na publicação.
 *
 * Fork Media Hub. `x`/`y` são a posição da etiqueta sobre a imagem, de 0 a 1 a
 * partir do canto superior esquerdo — a Meta só aceita coordenadas em imagem;
 * em vídeo e reel a marcação vale sem posição.
 */
export class InstagramUserTag {
  @IsDefined()
  @IsString()
  username: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  x?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  y?: number;
}

export class InstagramDto {
  @IsIn(['post', 'story'])
  @IsDefined()
  post_type: 'post' | 'story';

  @IsOptional()
  is_trial_reel?: boolean;

  @IsIn(['MANUAL', 'SS_PERFORMANCE'])
  @IsOptional()
  graduation_strategy?: 'MANUAL' | 'SS_PERFORMANCE';

  @Type(() => Collaborators)
  @ValidateNested({ each: true })
  @IsArray()
  @IsOptional()
  collaborators: Collaborators[];

  @Type(() => InstagramAudio)
  @ValidateNested()
  @IsOptional()
  audio?: InstagramAudio;

  // ----------------------------------------------------------------
  // Fork Media Hub — configurações avançadas do Instagram
  //
  // Tudo abaixo existe na API da Meta e não era repassado pelo Postiz. Cada
  // campo diz onde vale, porque a Meta não aceita os mesmos em todo lugar:
  // `alt_text` é só imagem, `location_id` não vale em story, e as coordenadas
  // de marcação só existem em imagem.
  // ----------------------------------------------------------------

  /** Comentário publicado logo após o post — onde as agências põem as hashtags. */
  @IsOptional()
  @IsString()
  first_comment?: string;

  /** Descrição para leitores de tela. Só imagem: Reels e stories não aceitam. */
  @IsOptional()
  @IsString()
  alt_text?: string;

  /** Id de página/lugar da Meta. Não vale em story. */
  @IsOptional()
  @IsString()
  location_id?: string;

  /** Pessoas marcadas. Com x/y em imagem; só o username em vídeo. */
  @Type(() => InstagramUserTag)
  @ValidateNested({ each: true })
  @IsArray()
  @IsOptional()
  user_tags?: InstagramUserTag[];

  /** Fecha os comentários depois de publicar. */
  @IsOptional()
  disable_comments?: boolean;
}
