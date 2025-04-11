"use client";
import { useScroll, useTransform } from "framer-motion";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

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
    offset: ["start start", "end start"],
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

  const BookImage = ({ book }: { book: ParallaxBook }) => (
    <Link
      href={`/books/${book.bookId}?returnQuery=${encodeURIComponent(
        book.query
      )}&returnPage=${book.currentPage}`}
    >
      <div className="relative w-[200px] h-[300px]">
        <Image
          src={book.imageUrl}
          alt={`Cover of ${book.title}`}
          className="rounded-lg object-contain"
          fill
          sizes="200px"
          priority
        />
      </div>
    </Link>
  );

  return (
    <div
      className={cn("h-[500vh] items-start overflow-y-auto w-full", className)}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 items-start max-w-7xl mx-auto gap-10 py-40 px-10">
        <div className="grid gap-10">
          {firstPart.map((el, idx) => (
            <motion.div style={{ y: translateFirst }} key={"grid-1" + idx}>
              <BookImage book={el} />
            </motion.div>
          ))}
        </div>
        <div className="grid gap-10">
          {secondPart.map((el, idx) => (
            <motion.div style={{ y: translateSecond }} key={"grid-2" + idx}>
              <BookImage book={el} />
            </motion.div>
          ))}
        </div>
        <div className="grid gap-10">
          {thirdPart.map((el, idx) => (
            <motion.div style={{ y: translateThird }} key={"grid-3" + idx}>
              <BookImage book={el} />
            </motion.div>
          ))}
        </div>
        <div className="grid gap-10">
          {fourthPart.map((el, idx) => (
            <motion.div style={{ y: translateFourth }} key={"grid-4" + idx}>
              <BookImage book={el} />
            </motion.div>
          ))}
        </div>
        <div className="grid gap-10">
          {fifthPart.map((el, idx) => (
            <motion.div style={{ y: translateFifth }} key={"grid-5" + idx}>
              <BookImage book={el} />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};
