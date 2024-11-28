'use client';
import { useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface ParallaxBook {
  imageUrl: string;
  bookId: string;
  title: string;
  query: string;
  currentPage: number;
}

export const ParallaxScroll = ({
  books,
  className,
}: {
  books: ParallaxBook[];
  className?: string;
}) => {
  const { scrollYProgress } = useScroll({
    offset: ['start start', 'end start'],
  });
  const translateFirst = useTransform(scrollYProgress, [0, 1], [0, -200]);
  const translateSecond = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const translateThird = useTransform(scrollYProgress, [0, 1], [0, -200]);
  const translateFourth = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const translateFifth = useTransform(scrollYProgress, [0, 1], [0, -200]);

  const fifth = Math.ceil(books.length / 5);
  const firstPart = books.slice(0, fifth);
  const secondPart = books.slice(fifth, 2 * fifth);
  const thirdPart = books.slice(2 * fifth, 3 * fifth);
  const fourthPart = books.slice(3 * fifth, 4 * fifth);
  const fifthPart = books.slice(4 * fifth);

  return (
    <div className={cn('w-full flex justify-center', className)}>
      <div className="grid grid-cols-5 items-start w-fit gap-20 py-20">
        <div className="grid gap-16">
          {firstPart.map((book, idx) => (
            <motion.div style={{ y: translateFirst }} key={'grid-1' + idx}>
              <Link
                href={`/books/${book.bookId}?returnQuery=${encodeURIComponent(
                  book.query
                )}&returnPage=${book.currentPage}`}
              >
                <div className="relative aspect-2/3 w-[200px]">
                  <Image
                    src={book.imageUrl}
                    className="rounded-lg m-0! p-0!"
                    fill
                    sizes="200px"
                    style={{ objectFit: 'contain' }}
                    alt={book.title}
                    priority
                  />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
        <div className="grid gap-16">
          {secondPart.map((book, idx) => (
            <motion.div style={{ y: translateSecond }} key={'grid-2' + idx}>
              <Link
                href={`/books/${book.bookId}?returnQuery=${encodeURIComponent(
                  book.query
                )}&returnPage=${book.currentPage}`}
              >
                <div className="relative aspect-2/3 w-[200px]">
                  <Image
                    src={book.imageUrl}
                    className="rounded-lg m-0! p-0!"
                    fill
                    sizes="200px"
                    style={{ objectFit: 'contain' }}
                    alt={book.title}
                    priority
                  />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
        <div className="grid gap-16">
          {thirdPart.map((book, idx) => (
            <motion.div style={{ y: translateThird }} key={'grid-3' + idx}>
              <Link
                href={`/books/${book.bookId}?returnQuery=${encodeURIComponent(
                  book.query
                )}&returnPage=${book.currentPage}`}
              >
                <div className="relative aspect-2/3 w-[200px]">
                  <Image
                    src={book.imageUrl}
                    className="rounded-lg m-0! p-0!"
                    fill
                    sizes="200px"
                    style={{ objectFit: 'contain' }}
                    alt={book.title}
                    priority
                  />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
        <div className="grid gap-16">
          {fourthPart.map((book, idx) => (
            <motion.div style={{ y: translateFourth }} key={'grid-4' + idx}>
              <Link
                href={`/books/${book.bookId}?returnQuery=${encodeURIComponent(
                  book.query
                )}&returnPage=${book.currentPage}`}
              >
                <div className="relative aspect-2/3 w-[200px]">
                  <Image
                    src={book.imageUrl}
                    className="rounded-lg m-0! p-0!"
                    fill
                    sizes="200px"
                    style={{ objectFit: 'contain' }}
                    alt={book.title}
                    priority
                  />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
        <div className="grid gap-16">
          {fifthPart.map((book, idx) => (
            <motion.div style={{ y: translateFifth }} key={'grid-5' + idx}>
              <Link
                href={`/books/${book.bookId}?returnQuery=${encodeURIComponent(
                  book.query
                )}&returnPage=${book.currentPage}`}
              >
                <div className="relative aspect-2/3 w-[200px]">
                  <Image
                    src={book.imageUrl}
                    className="rounded-lg m-0! p-0!"
                    fill
                    sizes="200px"
                    style={{ objectFit: 'contain' }}
                    alt={book.title}
                    priority
                  />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};
