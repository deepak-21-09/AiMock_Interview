import axios from 'axios';
import {
  User, CandidateProfile, Resume, InterviewPlan,
  TurnActionResponse, InterviewReport, PracticeComparison
} from '../types';

const API_BASE = '/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const api = {
  // Auth
  register: (data: any) => apiClient.post('/auth/register', data).then(r => r.data),
  login: (data: any) => apiClient.post('/auth/login', data).then(r => r.data),
  getMe: (): Promise<User> => apiClient.get('/auth/me').then(r => r.data),
  getProfile: (): Promise<CandidateProfile> => apiClient.get('/auth/profile').then(r => r.data),
  updateProfile: (data: Partial<CandidateProfile>): Promise<CandidateProfile> => apiClient.put('/auth/profile', data).then(r => r.data),

  // Resumes
  uploadResume: (formData: FormData): Promise<Resume> => apiClient.post('/resumes/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(r => r.data),
  listResumes: (): Promise<Resume[]> => apiClient.get('/resumes').then(r => r.data),
  getResume: (id: string): Promise<Resume> => apiClient.get(`/resumes/${id}`).then(r => r.data),
  updateResumeSkills: (id: string, skills: string[]): Promise<Resume> => apiClient.put(`/resumes/${id}/skills`, { skills }).then(r => r.data),
  deleteResume: (id: string) => apiClient.delete(`/resumes/${id}`).then(r => r.data),

  // Interviews
  planInterview: (data: any): Promise<InterviewPlan> => apiClient.post('/interviews/plan', data).then(r => r.data),
  listInterviews: () => apiClient.get('/interviews').then(r => r.data),
  getInterviewDetail: (id: string) => apiClient.get(`/interviews/${id}`).then(r => r.data),
  startInterview: (id: string, data: any): Promise<TurnActionResponse> => apiClient.post(`/interviews/${id}/start`, data).then(r => r.data),
  submitAnswer: (id: string, data: { question_id: string; audio_base64?: string; text_answer?: string; duration_seconds?: number }): Promise<TurnActionResponse> =>
    apiClient.post(`/interviews/${id}/answer`, data).then(r => r.data),
  repeatQuestion: (id: string): Promise<TurnActionResponse> => apiClient.post(`/interviews/${id}/repeat`).then(r => r.data),
  clarifyQuestion: (id: string): Promise<TurnActionResponse> => apiClient.post(`/interviews/${id}/clarify`).then(r => r.data),
  skipQuestion: (id: string): Promise<TurnActionResponse> => apiClient.post(`/interviews/${id}/skip`).then(r => r.data),
  endInterview: (id: string): Promise<TurnActionResponse> => apiClient.post(`/interviews/${id}/end`).then(r => r.data),

  // Reports
  getReport: (sessionId: string): Promise<InterviewReport> => apiClient.get(`/interviews/${sessionId}/report`).then(r => r.data),

  // Practice
  retryQuestion: (questionId: string, data: { text_answer?: string; audio_base64?: string }): Promise<PracticeComparison> =>
    apiClient.post(`/practice/${questionId}/retry`, data).then(r => r.data),
  getPracticeComparison: (attemptId: string): Promise<PracticeComparison> => apiClient.get(`/practice/${attemptId}/comparison`).then(r => r.data),

  // History & Privacy
  getHistory: () => apiClient.get('/history').then(r => r.data),
  deleteInterview: (id: string) => apiClient.delete(`/history/interviews/${id}`).then(r => r.data),
  deleteAccountData: () => apiClient.delete('/history/account/data').then(r => r.data),
};
