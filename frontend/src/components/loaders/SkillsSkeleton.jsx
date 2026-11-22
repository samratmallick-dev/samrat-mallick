import React from 'react';
import { Card } from '../ui/card';
import { Skeleton } from '../ui/skeleton';

const SkillsSkeleton = () => (
      <>
            {[...Array(3)].map((_, i) => (
                  <Card key={i} className="flex h-full flex-col gap-5 rounded-2xl p-6">
                        <div className="flex items-center gap-3">
                              <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
                              <div className="space-y-2">
                                    <Skeleton className="h-5 w-36" />
                                    <Skeleton className="h-3 w-20" />
                              </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                              {[...Array(6)].map((_, j) => (
                                    <Skeleton key={j} className="h-8 w-24 rounded-full" />
                              ))}
                        </div>
                  </Card>
            ))}
      </>
);

export default SkillsSkeleton;
