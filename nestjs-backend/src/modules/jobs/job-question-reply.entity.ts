import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { JobQuestion } from './job-question.entity';
import { User } from '../users/user.entity';

@Entity('job_question_replies')
export class JobQuestionReply {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36 })
  questionId: string;

  @ManyToOne(() => JobQuestion, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'questionId' })
  question: JobQuestion;

  @Column({ type: 'varchar', length: 36 })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'text' })
  text: string;

  @CreateDateColumn()
  createdAt: Date;
}
