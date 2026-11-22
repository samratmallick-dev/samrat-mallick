import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { ArrowLeft, FolderKanban, Home, Mail, SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';

const containerVariants = {
      hidden: { opacity: 0, y: 24 },
      visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.5, ease: 'easeOut', staggerChildren: 0.08 },
      },
};

const itemVariants = {
      hidden: { opacity: 0, y: 16 },
      visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

const NotFound = ({
      code = '404',
      title = 'Page not found',
      message = "The page you're looking for doesn't exist, may have been moved, or is temporarily unavailable.",
      homeLabel = 'Back to Home',
      homePath = '/portfolio/home',
      showProjectLink = true,
}) => {
      return (
            <section className="relative flex min-h-[75vh] items-center justify-center overflow-hidden bg-background px-4 pt-32 pb-20 text-foreground">
                  <Helmet>
                        <title>{`${code} — ${title} | Samrat Mallick Portfolio`}</title>
                        <meta name="description" content={message} />
                        <meta name="robots" content="noindex, follow" />
                  </Helmet>

                  <div aria-hidden="true" className="pointer-events-none absolute inset-0">
                        <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
                        <div className="absolute right-1/4 bottom-0 h-64 w-64 rounded-full bg-secondary/20 blur-3xl" />
                  </div>

                  <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="relative z-10 mx-auto w-full max-w-2xl text-center"
                  >
                        <motion.div variants={itemVariants} className="mb-6 flex justify-center">
                              <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-1.5 text-xs font-medium tracking-widest text-primary uppercase">
                                    <SearchX className="h-4 w-4" />
                                    Error {code}
                              </span>
                        </motion.div>

                        <motion.p
                              variants={itemVariants}
                              aria-hidden="true"
                              className="text-gradient text-7xl leading-none font-extrabold select-none sm:text-8xl md:text-9xl"
                        >
                              {code}
                        </motion.p>

                        <motion.h1 variants={itemVariants} className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
                              {title}
                        </motion.h1>

                        <motion.p variants={itemVariants} className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                              {message}
                        </motion.p>

                        <motion.div variants={itemVariants} className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                              <Button asChild size="lg">
                                    <Link to={homePath}>
                                          <Home className="h-4 w-4" />
                                          {homeLabel}
                                    </Link>
                              </Button>
                              {showProjectLink && homePath !== '/projects' && (
                                    <Button asChild variant="outline" size="lg">
                                          <Link to="/projects">
                                                <FolderKanban className="h-4 w-4" />
                                                Browse Projects
                                          </Link>
                                    </Button>
                              )}
                              <Button asChild variant="ghost" size="lg">
                                    <Link to="/portfolio/contact">
                                          <Mail className="h-4 w-4" />
                                          Contact Me
                                    </Link>
                              </Button>
                        </motion.div>

                        <motion.div variants={itemVariants} className="mt-10">
                              <Link
                                    to="/portfolio/home"
                                    className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                              >
                                    <ArrowLeft className="h-4 w-4" />
                                    Return to portfolio
                              </Link>
                        </motion.div>
                  </motion.div>
            </section>
      );
};

export default NotFound;
