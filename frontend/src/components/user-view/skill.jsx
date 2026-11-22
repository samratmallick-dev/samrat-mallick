import React from 'react';
import SkillCard from './skill-card';
import SkillsSkeleton from '../loaders/SkillsSkeleton';
import SectionError from '../loaders/SectionError';
import { useLazySection } from '@/hooks/useLazySection';
import { getIconComponent } from '@/config/iconRegistry';

const MySkills = () => {
      const { ref, data: skills, status, isLoading, isError, error, retry } = useLazySection('skills');

      const categories = Array.isArray(skills)
            ? skills.filter((skillCategory) => skillCategory.skills && skillCategory.skills.length > 0)
            : [];
      const showSkeleton = isLoading || status === 'idle';

      return (
            <section ref={ref} id="skills" className="py-20 border-b border-border">
                  <div className="container mx-auto px-4">
                        <div className="mb-12 text-center">
                              <h2 className="text-4xl font-bold text-gradient">Skills Overview</h2>
                              <p className="mt-3 text-sm text-muted-foreground">
                                    The technologies and tools I use, organized by area.
                              </p>
                        </div>
                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 max-w-6xl mx-auto">
                              {showSkeleton ? (
                                    <SkillsSkeleton />
                              ) : isError ? (
                                    <SectionError className="col-span-full" message={error || 'Unable to load skills.'} onRetry={retry} />
                              ) : categories.length > 0 ? (
                                    categories.map((skillCategory, index) => (
                                          <div key={skillCategory._id || index} className="animate-slide-up h-full" style={{ animationDelay: `${(index + 3) * 0.2}s` }}>
                                                <SkillCard
                                                      title={skillCategory.category}
                                                      skills={skillCategory.skills.map((s) => {
                                                            const Icon = getIconComponent(s.iconName);
                                                            return {
                                                                  id: s._id,
                                                                  name: s.name,
                                                                  icon: Icon ? (
                                                                        <Icon className={`h-4 w-4 shrink-0 ${s.iconColor || 'text-primary'}`} />
                                                                  ) : null
                                                            };
                                                      })}
                                                />
                                          </div>
                                    ))
                              ) : (
                                    <div className="col-span-full text-center text-muted-foreground">No skills found.</div>
                              )}
                        </div>
                  </div>
            </section>
      );
};

export default React.memo(MySkills);
