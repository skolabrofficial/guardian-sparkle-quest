export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      account_access_approvals: {
        Row: {
          approver_id: string
          created_at: string
          decision: string
          id: string
          note: string | null
          request_id: string
        }
        Insert: {
          approver_id: string
          created_at?: string
          decision: string
          id?: string
          note?: string | null
          request_id: string
        }
        Update: {
          approver_id?: string
          created_at?: string
          decision?: string
          id?: string
          note?: string | null
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_access_approvals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "account_access_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      account_access_grants: {
        Row: {
          granted_at: string
          grantee_id: string
          id: string
          request_id: string
          revoked_at: string | null
          revoked_by: string | null
          scope: string
          target_user_id: string
        }
        Insert: {
          granted_at?: string
          grantee_id: string
          id?: string
          request_id: string
          revoked_at?: string | null
          revoked_by?: string | null
          scope: string
          target_user_id: string
        }
        Update: {
          granted_at?: string
          grantee_id?: string
          id?: string
          request_id?: string
          revoked_at?: string | null
          revoked_by?: string | null
          scope?: string
          target_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_access_grants_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "account_access_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      account_access_requests: {
        Row: {
          approved_at: string | null
          code_hash: string
          created_at: string
          id: string
          reason: string
          requested_by: string
          revoked_at: string | null
          revoked_by: string | null
          scope: string
          status: string
          target_user_id: string
          used_at: string | null
        }
        Insert: {
          approved_at?: string | null
          code_hash: string
          created_at?: string
          id?: string
          reason: string
          requested_by: string
          revoked_at?: string | null
          revoked_by?: string | null
          scope: string
          status?: string
          target_user_id: string
          used_at?: string | null
        }
        Update: {
          approved_at?: string | null
          code_hash?: string
          created_at?: string
          id?: string
          reason?: string
          requested_by?: string
          revoked_at?: string | null
          revoked_by?: string | null
          scope?: string
          status?: string
          target_user_id?: string
          used_at?: string | null
        }
        Relationships: []
      }
      announcements: {
        Row: {
          author_id: string | null
          content: string | null
          created_at: string
          id: string
          is_active: boolean | null
          priority: string | null
          scheduled_for: string | null
          target_role: Database["public"]["Enums"]["app_role"] | null
          title: string
        }
        Insert: {
          author_id?: string | null
          content?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          priority?: string | null
          scheduled_for?: string | null
          target_role?: Database["public"]["Enums"]["app_role"] | null
          title: string
        }
        Update: {
          author_id?: string | null
          content?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          priority?: string | null
          scheduled_for?: string | null
          target_role?: Database["public"]["Enums"]["app_role"] | null
          title?: string
        }
        Relationships: []
      }
      article_editors: {
        Row: {
          created_at: string
          granted_by: string | null
          id: string
          note: string | null
          topic_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          id?: string
          note?: string | null
          topic_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          id?: string
          note?: string | null
          topic_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_editors_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "article_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      article_kvalitarka: {
        Row: {
          article_id: string
          author_id: string
          body: string
          created_at: string
          edited_at: string | null
          id: string
          is_deleted: boolean
          parent_id: string | null
        }
        Insert: {
          article_id: string
          author_id: string
          body: string
          created_at?: string
          edited_at?: string | null
          id?: string
          is_deleted?: boolean
          parent_id?: string | null
        }
        Update: {
          article_id?: string
          author_id?: string
          body?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          is_deleted?: boolean
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "article_kvalitarka_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_kvalitarka_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "article_kvalitarka"
            referencedColumns: ["id"]
          },
        ]
      }
      article_originality_checks: {
        Row: {
          article_id: string
          checked_by: string | null
          created_at: string
          id: string
          notes: string | null
          score: number | null
          sources: Json | null
          verdict: string | null
        }
        Insert: {
          article_id: string
          checked_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          score?: number | null
          sources?: Json | null
          verdict?: string | null
        }
        Update: {
          article_id?: string
          checked_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          score?: number | null
          sources?: Json | null
          verdict?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "article_originality_checks_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      article_points: {
        Row: {
          amount: number
          article_id: string
          created_at: string
          granted_by: string | null
          id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          amount: number
          article_id: string
          created_at?: string
          granted_by?: string | null
          id?: string
          reason?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          article_id?: string
          created_at?: string
          granted_by?: string | null
          id?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_points_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      article_revisions: {
        Row: {
          article_id: string
          created_at: string
          diff_after: string | null
          diff_before: string | null
          diff_new: string | null
          diff_old: string | null
          editor_id: string | null
          field: string
          id: string
          new_value: string | null
          note: string | null
          old_value: string | null
          save_group: string | null
        }
        Insert: {
          article_id: string
          created_at?: string
          diff_after?: string | null
          diff_before?: string | null
          diff_new?: string | null
          diff_old?: string | null
          editor_id?: string | null
          field: string
          id?: string
          new_value?: string | null
          note?: string | null
          old_value?: string | null
          save_group?: string | null
        }
        Update: {
          article_id?: string
          created_at?: string
          diff_after?: string | null
          diff_before?: string | null
          diff_new?: string | null
          diff_old?: string | null
          editor_id?: string | null
          field?: string
          id?: string
          new_value?: string | null
          note?: string | null
          old_value?: string | null
          save_group?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "article_revisions_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      article_status_log: {
        Row: {
          actor_id: string | null
          article_id: string
          created_at: string
          from_status: Database["public"]["Enums"]["article_status"] | null
          id: string
          reason: string | null
          to_status: Database["public"]["Enums"]["article_status"]
        }
        Insert: {
          actor_id?: string | null
          article_id: string
          created_at?: string
          from_status?: Database["public"]["Enums"]["article_status"] | null
          id?: string
          reason?: string | null
          to_status: Database["public"]["Enums"]["article_status"]
        }
        Update: {
          actor_id?: string | null
          article_id?: string
          created_at?: string
          from_status?: Database["public"]["Enums"]["article_status"] | null
          id?: string
          reason?: string | null
          to_status?: Database["public"]["Enums"]["article_status"]
        }
        Relationships: [
          {
            foreignKeyName: "article_status_log_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      article_topics: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
          symbol: string | null
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
          symbol?: string | null
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
          symbol?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      articles: {
        Row: {
          author_id: string | null
          author_override: string | null
          content: string | null
          cover_image: string | null
          created_at: string
          deleted_reason: string | null
          featured_until: string | null
          flagged_source: string | null
          id: string
          is_featured: boolean
          originality_checked_at: string | null
          originality_notes: string | null
          originality_score: number | null
          perex: string | null
          published_at: string | null
          rating: number | null
          rejection_reason: string | null
          scheduled_for: string | null
          slug: string | null
          status: Database["public"]["Enums"]["article_status"]
          status_note: string | null
          taken_at: string | null
          taken_by: string | null
          theft_source: string | null
          title: string
          topic_id: string | null
          updated_at: string
          view_count: number | null
          word_count: number | null
        }
        Insert: {
          author_id?: string | null
          author_override?: string | null
          content?: string | null
          cover_image?: string | null
          created_at?: string
          deleted_reason?: string | null
          featured_until?: string | null
          flagged_source?: string | null
          id?: string
          is_featured?: boolean
          originality_checked_at?: string | null
          originality_notes?: string | null
          originality_score?: number | null
          perex?: string | null
          published_at?: string | null
          rating?: number | null
          rejection_reason?: string | null
          scheduled_for?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["article_status"]
          status_note?: string | null
          taken_at?: string | null
          taken_by?: string | null
          theft_source?: string | null
          title?: string
          topic_id?: string | null
          updated_at?: string
          view_count?: number | null
          word_count?: number | null
        }
        Update: {
          author_id?: string | null
          author_override?: string | null
          content?: string | null
          cover_image?: string | null
          created_at?: string
          deleted_reason?: string | null
          featured_until?: string | null
          flagged_source?: string | null
          id?: string
          is_featured?: boolean
          originality_checked_at?: string | null
          originality_notes?: string | null
          originality_score?: number | null
          perex?: string | null
          published_at?: string | null
          rating?: number | null
          rejection_reason?: string | null
          scheduled_for?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["article_status"]
          status_note?: string | null
          taken_at?: string | null
          taken_by?: string | null
          theft_source?: string | null
          title?: string
          topic_id?: string | null
          updated_at?: string
          view_count?: number | null
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "articles_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "article_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      block_actions: {
        Row: {
          action_type: string
          actor_id: string
          block_id: string
          created_at: string
          description: string | null
          id: string
          is_public: boolean | null
          metadata: Json | null
        }
        Insert: {
          action_type: string
          actor_id: string
          block_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          metadata?: Json | null
        }
        Update: {
          action_type?: string
          actor_id?: string
          block_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "block_actions_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "user_blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      block_messages: {
        Row: {
          acknowledged_at: string | null
          block_id: string
          created_at: string
          generated_by: string | null
          id: string
          message_text: string
          sent_to_alik: boolean | null
        }
        Insert: {
          acknowledged_at?: string | null
          block_id: string
          created_at?: string
          generated_by?: string | null
          id?: string
          message_text: string
          sent_to_alik?: boolean | null
        }
        Update: {
          acknowledged_at?: string | null
          block_id?: string
          created_at?: string
          generated_by?: string | null
          id?: string
          message_text?: string
          sent_to_alik?: boolean | null
        }
        Relationships: []
      }
      changelog_entries: {
        Row: {
          author_id: string
          category: string
          created_at: string
          description: string
          id: string
          severity: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          category?: string
          created_at?: string
          description?: string
          id?: string
          severity?: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          category?: string
          created_at?: string
          description?: string
          id?: string
          severity?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      content_blocks: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          custom_css: string | null
          id: string
          image_url: string | null
          is_active: boolean
          link_text: string | null
          link_url: string | null
          page_path: string
          position: string
          sort_order: number
          style_preset: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          created_by?: string | null
          custom_css?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_text?: string | null
          link_url?: string | null
          page_path: string
          position?: string
          sort_order?: number
          style_preset?: string
          title?: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          custom_css?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_text?: string | null
          link_url?: string | null
          page_path?: string
          position?: string
          sort_order?: number
          style_preset?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      courses: {
        Row: {
          building: string | null
          capacity_note: string | null
          created_at: string
          credits: number | null
          day_of_week: string | null
          description: string | null
          difficulty: string | null
          exam_type: string | null
          faculty_id: string | null
          id: string
          is_active: boolean | null
          language: string | null
          lektor_id: string | null
          max_students: number | null
          prerequisites: string | null
          room: string | null
          schedule_note: string | null
          semester: string | null
          syllabus: string | null
          time_slot: string | null
          title: string
          updated_at: string
        }
        Insert: {
          building?: string | null
          capacity_note?: string | null
          created_at?: string
          credits?: number | null
          day_of_week?: string | null
          description?: string | null
          difficulty?: string | null
          exam_type?: string | null
          faculty_id?: string | null
          id?: string
          is_active?: boolean | null
          language?: string | null
          lektor_id?: string | null
          max_students?: number | null
          prerequisites?: string | null
          room?: string | null
          schedule_note?: string | null
          semester?: string | null
          syllabus?: string | null
          time_slot?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          building?: string | null
          capacity_note?: string | null
          created_at?: string
          credits?: number | null
          day_of_week?: string | null
          description?: string | null
          difficulty?: string | null
          exam_type?: string | null
          faculty_id?: string | null
          id?: string
          is_active?: boolean | null
          language?: string | null
          lektor_id?: string | null
          max_students?: number | null
          prerequisites?: string | null
          room?: string | null
          schedule_note?: string | null
          semester?: string | null
          syllabus?: string | null
          time_slot?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculties"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          course_id: string
          enrolled_at: string
          id: string
          status: string | null
          student_id: string
        }
        Insert: {
          course_id: string
          enrolled_at?: string
          id?: string
          status?: string | null
          student_id: string
        }
        Update: {
          course_id?: string
          enrolled_at?: string
          id?: string
          status?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_history: {
        Row: {
          action: string
          changes: Json
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          user_id: string
        }
        Insert: {
          action: string
          changes?: Json
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          changes?: Json
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      faculties: {
        Row: {
          color: string | null
          created_at: string
          dean_id: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          dean_id?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          dean_id?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      forum_posts: {
        Row: {
          author_id: string
          content: string
          course_id: string
          created_at: string
          id: string
          is_deleted: boolean | null
          is_locked: boolean | null
          is_pinned: boolean | null
          label: string | null
          moved_from_course_id: string | null
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          course_id: string
          created_at?: string
          id?: string
          is_deleted?: boolean | null
          is_locked?: boolean | null
          is_pinned?: boolean | null
          label?: string | null
          moved_from_course_id?: string | null
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          course_id?: string
          created_at?: string
          id?: string
          is_deleted?: boolean | null
          is_locked?: boolean | null
          is_pinned?: boolean | null
          label?: string | null
          moved_from_course_id?: string | null
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_posts_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_posts_moved_from_course_id_fkey"
            columns: ["moved_from_course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_posts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      gdpr_consents: {
        Row: {
          accepted: boolean
          consent_type: string
          created_at: string
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          accepted?: boolean
          consent_type: string
          created_at?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          accepted?: boolean
          consent_type?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      mediation_messages_v2: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          mediation_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          mediation_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          mediation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mediation_messages_v2_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "mediation_messages_v2_mediation_id_fkey"
            columns: ["mediation_id"]
            isOneToOne: false
            referencedRelation: "mediations_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      mediations_v2: {
        Row: {
          created_at: string
          id: string
          last_message_at: string | null
          message_count: number
          opened_by: string
          request_reason: string | null
          resolution: string | null
          resolution_added_to_notes: boolean
          resolved_at: string | null
          resolved_by: string | null
          status: string
          subject_user_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          message_count?: number
          opened_by: string
          request_reason?: string | null
          resolution?: string | null
          resolution_added_to_notes?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          subject_user_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          message_count?: number
          opened_by?: string
          request_reason?: string | null
          resolution?: string | null
          resolution_added_to_notes?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          subject_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mediations_v2_opened_by_fkey"
            columns: ["opened_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "mediations_v2_subject_user_id_fkey"
            columns: ["subject_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          link: string | null
          message: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      page_styles: {
        Row: {
          class_name: string | null
          created_at: string
          css_content: string
          description: string | null
          id: string
          is_active: boolean
          page_path: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          class_name?: string | null
          created_at?: string
          css_content?: string
          description?: string | null
          id?: string
          is_active?: boolean
          page_path: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          class_name?: string | null
          created_at?: string
          css_content?: string
          description?: string | null
          id?: string
          is_active?: boolean
          page_path?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string
          id: string
          last_seen: string | null
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          id?: string
          last_seen?: string | null
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          id?: string
          last_seen?: string | null
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      protokol_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          id: string
          source_id: string
          source_table: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          source_id: string
          source_table: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          source_id?: string
          source_table?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          reason: string
          reporter_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string | null
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          reason: string
          reporter_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          reason?: string
          reporter_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
        }
        Relationships: []
      }
      schedule_items: {
        Row: {
          course_id: string | null
          created_at: string
          day_of_week: string
          id: string
          room: string | null
          time_slot: string
          title: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          day_of_week: string
          id?: string
          room?: string | null
          time_slot: string
          title: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          day_of_week?: string
          id?: string
          room?: string | null
          time_slot?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_items_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_page_boxes: {
        Row: {
          color: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_visible: boolean
          member_ids: string[]
          sort_order: number
          symbol: string | null
          title: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_visible?: boolean
          member_ids?: string[]
          sort_order?: number
          symbol?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_visible?: boolean
          member_ids?: string[]
          sort_order?: number
          symbol?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      staff_page_settings: {
        Row: {
          accepting_questions: boolean | null
          achievements: string[] | null
          alik_username: string | null
          availability_status: string | null
          bio_short: string | null
          contact_hours: string | null
          custom_note: string | null
          education: string | null
          experience_years: number | null
          favorite_subject: string | null
          fun_fact: string | null
          hobbies: string | null
          id: string
          is_visible: boolean | null
          joined_date: string | null
          languages: string | null
          max_questions_daily: number | null
          motto: string | null
          preferred_contact: string | null
          profile_color: string | null
          response_style: string | null
          show_answers_link: boolean | null
          show_mail_link: boolean | null
          show_profile_link: boolean | null
          social_link: string | null
          sort_order: number | null
          specialization: string | null
          updated_at: string
          user_id: string
          working_days: string | null
        }
        Insert: {
          accepting_questions?: boolean | null
          achievements?: string[] | null
          alik_username?: string | null
          availability_status?: string | null
          bio_short?: string | null
          contact_hours?: string | null
          custom_note?: string | null
          education?: string | null
          experience_years?: number | null
          favorite_subject?: string | null
          fun_fact?: string | null
          hobbies?: string | null
          id?: string
          is_visible?: boolean | null
          joined_date?: string | null
          languages?: string | null
          max_questions_daily?: number | null
          motto?: string | null
          preferred_contact?: string | null
          profile_color?: string | null
          response_style?: string | null
          show_answers_link?: boolean | null
          show_mail_link?: boolean | null
          show_profile_link?: boolean | null
          social_link?: string | null
          sort_order?: number | null
          specialization?: string | null
          updated_at?: string
          user_id: string
          working_days?: string | null
        }
        Update: {
          accepting_questions?: boolean | null
          achievements?: string[] | null
          alik_username?: string | null
          availability_status?: string | null
          bio_short?: string | null
          contact_hours?: string | null
          custom_note?: string | null
          education?: string | null
          experience_years?: number | null
          favorite_subject?: string | null
          fun_fact?: string | null
          hobbies?: string | null
          id?: string
          is_visible?: boolean | null
          joined_date?: string | null
          languages?: string | null
          max_questions_daily?: number | null
          motto?: string | null
          preferred_contact?: string | null
          profile_color?: string | null
          response_style?: string | null
          show_answers_link?: boolean | null
          show_mail_link?: boolean | null
          show_profile_link?: boolean | null
          social_link?: string | null
          sort_order?: number | null
          specialization?: string | null
          updated_at?: string
          user_id?: string
          working_days?: string | null
        }
        Relationships: []
      }
      study_notes: {
        Row: {
          content: string | null
          course_id: string | null
          created_at: string
          id: string
          is_public: boolean | null
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          course_id?: string | null
          created_at?: string
          id?: string
          is_public?: boolean | null
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          course_id?: string | null
          created_at?: string
          id?: string
          is_public?: boolean | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_notes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      study_plans: {
        Row: {
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          is_completed: boolean | null
          sort_order: number | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean | null
          sort_order?: number | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean | null
          sort_order?: number | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json | null
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json | null
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json | null
        }
        Relationships: []
      }
      tutoring_answers: {
        Row: {
          answer: string
          created_at: string
          id: string
          is_best: boolean | null
          mentor_id: string
          question_id: string
          visibility: string
        }
        Insert: {
          answer: string
          created_at?: string
          id?: string
          is_best?: boolean | null
          mentor_id: string
          question_id: string
          visibility?: string
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          is_best?: boolean | null
          mentor_id?: string
          question_id?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "tutoring_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "tutoring_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      tutoring_questions: {
        Row: {
          assigned_to: string | null
          context: string | null
          created_at: string
          id: string
          question: string
          status: string | null
          topic: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          context?: string | null
          created_at?: string
          id?: string
          question: string
          status?: string | null
          topic: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          context?: string | null
          created_at?: string
          id?: string
          question?: string
          status?: string | null
          topic?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      uploaded_images: {
        Row: {
          author_name: string | null
          created_at: string
          embed_code: string | null
          file_name: string
          file_size: number | null
          file_url: string
          google_match_found: boolean | null
          google_match_url: string | null
          id: string
          is_avatar: boolean | null
          license_type: string
          mime_type: string | null
          rejection_details: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source_url: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          author_name?: string | null
          created_at?: string
          embed_code?: string | null
          file_name: string
          file_size?: number | null
          file_url: string
          google_match_found?: boolean | null
          google_match_url?: string | null
          id?: string
          is_avatar?: boolean | null
          license_type?: string
          mime_type?: string | null
          rejection_details?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_url?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          author_name?: string | null
          created_at?: string
          embed_code?: string | null
          file_name?: string
          file_size?: number | null
          file_url?: string
          google_match_found?: boolean | null
          google_match_url?: string | null
          id?: string
          is_avatar?: boolean | null
          license_type?: string
          mime_type?: string | null
          rejection_details?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_blocks: {
        Row: {
          affected_areas: string[] | null
          appeal_response: string | null
          appeal_reviewed_at: string | null
          appeal_reviewed_by: string | null
          appeal_status: string | null
          appeal_submitted_at: string | null
          appeal_text: string | null
          assigned_to: string | null
          banned_ips: string[] | null
          block_count: number | null
          block_type: string
          blocked_at: string
          blocked_by: string
          details: string | null
          escalated: boolean | null
          escalated_to: string | null
          evidence_urls: string[] | null
          expires_at: string | null
          id: string
          internal_notes: string | null
          ip_ban_active: boolean | null
          ip_note: string | null
          is_active: boolean
          is_permanent: boolean | null
          last_warning_at: string | null
          metadata: Json | null
          notification_sent: boolean | null
          offense_category: string | null
          reason: string
          review_scheduled_at: string | null
          severity: string
          unblock_reason: string | null
          unblocked_at: string | null
          unblocked_by: string | null
          user_id: string
          visible_to_user: boolean | null
          warning_count: number | null
        }
        Insert: {
          affected_areas?: string[] | null
          appeal_response?: string | null
          appeal_reviewed_at?: string | null
          appeal_reviewed_by?: string | null
          appeal_status?: string | null
          appeal_submitted_at?: string | null
          appeal_text?: string | null
          assigned_to?: string | null
          banned_ips?: string[] | null
          block_count?: number | null
          block_type?: string
          blocked_at?: string
          blocked_by: string
          details?: string | null
          escalated?: boolean | null
          escalated_to?: string | null
          evidence_urls?: string[] | null
          expires_at?: string | null
          id?: string
          internal_notes?: string | null
          ip_ban_active?: boolean | null
          ip_note?: string | null
          is_active?: boolean
          is_permanent?: boolean | null
          last_warning_at?: string | null
          metadata?: Json | null
          notification_sent?: boolean | null
          offense_category?: string | null
          reason: string
          review_scheduled_at?: string | null
          severity?: string
          unblock_reason?: string | null
          unblocked_at?: string | null
          unblocked_by?: string | null
          user_id: string
          visible_to_user?: boolean | null
          warning_count?: number | null
        }
        Update: {
          affected_areas?: string[] | null
          appeal_response?: string | null
          appeal_reviewed_at?: string | null
          appeal_reviewed_by?: string | null
          appeal_status?: string | null
          appeal_submitted_at?: string | null
          appeal_text?: string | null
          assigned_to?: string | null
          banned_ips?: string[] | null
          block_count?: number | null
          block_type?: string
          blocked_at?: string
          blocked_by?: string
          details?: string | null
          escalated?: boolean | null
          escalated_to?: string | null
          evidence_urls?: string[] | null
          expires_at?: string | null
          id?: string
          internal_notes?: string | null
          ip_ban_active?: boolean | null
          ip_note?: string | null
          is_active?: boolean
          is_permanent?: boolean | null
          last_warning_at?: string | null
          metadata?: Json | null
          notification_sent?: boolean | null
          offense_category?: string | null
          reason?: string
          review_scheduled_at?: string | null
          severity?: string
          unblock_reason?: string | null
          unblocked_at?: string | null
          unblocked_by?: string | null
          user_id?: string
          visible_to_user?: boolean | null
          warning_count?: number | null
        }
        Relationships: []
      }
      user_ip_log: {
        Row: {
          created_at: string
          id: string
          ip_address: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_notes: {
        Row: {
          author_id: string
          block_id: string | null
          created_at: string
          id: string
          ip_address: string | null
          occurred_at: string
          private_description: string | null
          public_description: string | null
          punishment: string | null
          target_user_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          block_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          occurred_at?: string
          private_description?: string | null
          public_description?: string | null
          punishment?: string | null
          target_user_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          block_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          occurred_at?: string
          private_description?: string | null
          public_description?: string | null
          punishment?: string | null
          target_user_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_search_history: {
        Row: {
          context: string
          created_at: string
          id: string
          query: string
          user_id: string
        }
        Insert: {
          context?: string
          created_at?: string
          id?: string
          query: string
          user_id: string
        }
        Update: {
          context?: string
          created_at?: string
          id?: string
          query?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_mediation: {
        Args: { _med_id: string; _uid: string }
        Returns: boolean
      }
      can_view_article: {
        Args: { _article_id: string; _uid: string }
        Returns: boolean
      }
      close_mediation_with_resolution: {
        Args: {
          _add_to_notes?: boolean
          _mediation_id: string
          _resolution: string
        }
        Returns: undefined
      }
      create_account_access_request: {
        Args: { _reason: string; _scope: string; _target_user_id: string }
        Returns: {
          access_code: string
          request_id: string
        }[]
      }
      decide_account_access_request: {
        Args: { _decision: string; _note?: string; _request_id: string }
        Returns: string
      }
      get_highest_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_account_access: {
        Args: { _scope: string; _staff_id: string; _target_user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_article_editor: {
        Args: { _article_id: string; _uid: string }
        Returns: boolean
      }
      publish_due_articles: { Args: never; Returns: number }
      redeem_account_access_code: {
        Args: { _code: string; _request_id: string }
        Returns: string
      }
      release_article: { Args: { _article_id: string }; Returns: undefined }
      revoke_account_access: { Args: { _grant_id: string }; Returns: undefined }
      slugify: { Args: { input: string }; Returns: string }
      take_article: { Args: { _article_id: string }; Returns: undefined }
      update_user_wall_with_access: {
        Args: { _bio: string; _target_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "rektor" | "spravce" | "redaktor" | "lektor" | "student"
      article_status:
        | "draft_author"
        | "awaiting_review"
        | "returned_to_author"
        | "in_editing"
        | "polishing"
        | "ready_to_publish"
        | "scheduled"
        | "published"
        | "rejected"
        | "flagged_stolen"
        | "deleted"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["rektor", "spravce", "redaktor", "lektor", "student"],
      article_status: [
        "draft_author",
        "awaiting_review",
        "returned_to_author",
        "in_editing",
        "polishing",
        "ready_to_publish",
        "scheduled",
        "published",
        "rejected",
        "flagged_stolen",
        "deleted",
      ],
    },
  },
} as const
