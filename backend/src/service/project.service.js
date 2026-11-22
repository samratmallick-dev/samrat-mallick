import projectRepository from "../repository/project.repository.js";
import ApiError from "../utilities/error/apiError.js";
import Logger from "../config/logger/logger.config.js";
import { generateSlug } from "../utilities/slug.util.js";
import { uploadToCloudinary, deleteAssetSafely } from "../utilities/cloudinary/upload.js";

const SUBDOCUMENT_FIELDS = {
      features: (value) => ({ title: value }),
      architecture: (value) => ({ title: value }),
      process: (value, index) => ({ step: index + 1, title: value }),
      challenges: (value) => ({ challenge: value }),
      results: (value) => ({ title: value }),
};

class ProjectService {
      _shapeEntry(field, entry, index) {
            if (entry !== null && typeof entry === "object" && !Array.isArray(entry)) {
                  return entry;
            }
            const shape = SUBDOCUMENT_FIELDS[field];
            return shape ? shape(String(entry), index) : entry;
      }

      _parseArrayFields(data) {
            for (const field of Object.keys(SUBDOCUMENT_FIELDS)) {
                  if (!(field in data)) continue;

                  let value = data[field];
                  if (value === null || value === undefined || value === "") {
                        data[field] = [];
                        continue;
                  }

                  if (typeof value === "string") {
                        try {
                              const parsed = JSON.parse(value);
                              value = Array.isArray(parsed) ? parsed : [parsed];
                        } catch {
                              value = value.split(",").map((item) => item.trim()).filter(Boolean);
                        }
                  }

                  if (!Array.isArray(value)) value = [value];
                  data[field] = value.map((entry, index) => this._shapeEntry(field, entry, index));
            }
      }

      async createProject(projectData, imageFile = null) {
            Logger.info('Creating new project', { title: projectData.title });
            if (projectData.technologies && typeof projectData.technologies === 'string') {
                  projectData.technologies = projectData.technologies.split(',').map(t => t.trim()).filter(Boolean);
            }
            this._parseArrayFields(projectData);
            
            if (!projectData.slug) {
                  let baseSlug = generateSlug(projectData.title);
                  let slug = baseSlug;
                  let counter = 2;
                  while (await projectRepository.findAnyBySlug(slug)) {
                        slug = `${baseSlug}-${counter}`;
                        counter++;
                  }
                  projectData.slug = slug;
            } else {
                  if (await projectRepository.findAnyBySlug(projectData.slug)) {
                        throw ApiError.badRequest("Slug already exists");
                  }
            }

            let newImageId = null;
            if (imageFile) {
                  Logger.info('Uploading project image to Cloudinary');
                  const cloudinaryResponse = await uploadToCloudinary(imageFile, { folder: 'projects/images' });
                  newImageId = cloudinaryResponse.public_id;
                  projectData.image = {
                        public_id: newImageId,
                        url: cloudinaryResponse.secure_url,
                  };
            }

            try {
                  const project = await projectRepository.create(projectData);
                  Logger.info('Project created successfully', { projectId: project._id });
                  return project;
            } catch (error) {
                  if (newImageId) await deleteAssetSafely(newImageId);
                  if (error?.code === 11000) {
                        throw ApiError.conflict("A project with this slug already exists");
                  }
                  throw error;
            }
      }

      async getAllProjects() {
            const projects = await projectRepository.findActive();
            return projects;
      }

      async getPublicProjectsPage(query = {}) {
            return await projectRepository.findPublicPage(query);
      }

      async getProjectById(id) {
            const project = await projectRepository.findById(id);

            if (!project) {
                  throw ApiError.notFound("Project not found");
            }

            if (!project.isActive) {
                  throw ApiError.badRequest("Project is not active");
            }

            return project;
      }

      async getProjectBySlug(slug) {
            const project = await projectRepository.findBySlug(slug);

            if (!project) {
                  throw ApiError.notFound("Project not found");
            }

            return project;
      }

      async updateProject(id, projectData, imageFile = null) {
            const existingProject = await projectRepository.findById(id);

            if (!existingProject) {
                  throw ApiError.notFound("Project not found");
            }

            if (projectData.technologies && typeof projectData.technologies === 'string') {
                  projectData.technologies = projectData.technologies.split(',').map(t => t.trim()).filter(Boolean);
            }
            this._parseArrayFields(projectData);
            
            if (projectData.slug && projectData.slug !== existingProject.slug) {
                  if (await projectRepository.findAnyBySlug(projectData.slug)) {
                        throw ApiError.badRequest("Slug already exists");
                  }
            } else if (!projectData.slug) {
                  delete projectData.slug;
            }

            let newImageId = null;
            if (imageFile) {
                  Logger.info('Uploading updated project image to Cloudinary');
                  const cloudinaryResponse = await uploadToCloudinary(imageFile, { folder: 'projects/images' });
                  newImageId = cloudinaryResponse.public_id;
                  projectData.image = {
                        public_id: newImageId,
                        url: cloudinaryResponse.secure_url,
                  };
            }

            let updatedProject;
            try {
                  updatedProject = await projectRepository.updateById(id, projectData);
            } catch (error) {
                  if (newImageId) await deleteAssetSafely(newImageId);
                  throw error;
            }

            if (newImageId && existingProject.image?.public_id) {
                  await deleteAssetSafely(existingProject.image.public_id);
            }
            return updatedProject;
      }

      async deleteProject(id) {
            Logger.info('Deleting project', { projectId: id });
            const project = await projectRepository.findById(id);

            if (!project) {
                  Logger.error('Project deletion failed - project not found', { projectId: id });
                  throw ApiError.notFound("Project not found");
            }

            await projectRepository.deleteById(id);
            await deleteAssetSafely(project.image?.public_id);
            Logger.info('Project deleted successfully', { projectId: id });
            return { message: "Project deleted successfully" };
      }

      async getAllProjectsAdmin() {
            const projects = await projectRepository.findAll();
            return projects;
      }

      async getFeaturedProjects() {
            const projects = await projectRepository.findFeatured();
            return projects;
      }

      async getPublicFeaturedProjects() {
            return await projectRepository.findFeaturedPublic();
      }

      async setFeaturedProject(id, isFeatured) {
            const project = await projectRepository.findById(id);

            if (!project) {
                  throw ApiError.notFound("Project not found");
            }

            const updatedProject = await projectRepository.updateById(id, { isFeatured });
            return updatedProject;
      }
}

export default new ProjectService();
