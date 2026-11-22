import React from 'react';
import { Braces, Code2, Database, Layers, Rocket, Server, Wrench } from 'lucide-react';
import { Card } from '@/components/ui/card';

/**
 * Category icons are purely decorative — the categories themselves always come
 * from the database, so new/renamed categories keep working with a neutral icon.
 */
const getCategoryIcon = (title = '') => {
      const value = title.toLowerCase();
      if (value.includes('language')) return Braces;
      if (value.includes('front')) return Code2;
      if (value.includes('back')) return Server;
      if (value.includes('database') || value.includes('data')) return Database;
      if (value.includes('deploy') || value.includes('host')) return Rocket;
      if (value.includes('tool')) return Wrench;
      return Layers;
};

const SkillCard = ({ title, skills = [] }) => {
      const CategoryIcon = getCategoryIcon(title);

      return (
            <Card className="group relative flex h-full flex-col gap-5 overflow-hidden rounded-2xl border border-border/70 bg-card/80 p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
                  <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15 transition-colors duration-300 group-hover:bg-primary/15">
                              <CategoryIcon className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                              <h3 className="truncate text-lg font-semibold tracking-tight text-foreground">{title}</h3>
                              <p className="text-xs text-muted-foreground">
                                    {skills.length} {skills.length === 1 ? 'technology' : 'technologies'}
                              </p>
                        </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                        {skills.map((skill, index) => (
                              <span
                                    key={skill.id || `${skill.name}-${index}`}
                                    className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-muted/40 px-3 py-1.5 text-sm font-medium text-foreground/90 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                              >
                                    {skill.icon && (
                                          <span className="flex shrink-0 items-center" aria-hidden="true">
                                                {skill.icon}
                                          </span>
                                    )}
                                    {skill.name}
                              </span>
                        ))}
                  </div>
            </Card>
      );
};

export default React.memo(SkillCard);
