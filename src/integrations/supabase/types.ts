export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15";
  };
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      ads: {
        Row: {
          body: string | null;
          budget_amount: number;
          campus_id: string | null;
          created_at: string;
          cta_url: string | null;
          id: string;
          image_url: string | null;
          impressions_left: number;
          like_count: number;
          poster_id: string;
          status: string;
          title: string;
          video_url: string | null;
          view_count: number;
        };
        Insert: {
          body?: string | null;
          budget_amount?: number;
          campus_id?: string | null;
          created_at?: string;
          cta_url?: string | null;
          id?: string;
          image_url?: string | null;
          impressions_left?: number;
          like_count?: number;
          poster_id: string;
          status?: string;
          title: string;
          video_url?: string | null;
          view_count?: number;
        };
        Update: {
          body?: string | null;
          budget_amount?: number;
          campus_id?: string | null;
          created_at?: string;
          cta_url?: string | null;
          id?: string;
          image_url?: string | null;
          impressions_left?: number;
          like_count?: number;
          poster_id?: string;
          status?: string;
          title?: string;
          video_url?: string | null;
          view_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: "ads_campus_id_fkey";
            columns: ["campus_id"];
            isOneToOne: false;
            referencedRelation: "campuses";
            referencedColumns: ["id"];
          },
        ];
      };
      ads_views: {
        Row: {
          ad_id: string;
          created_at: string;
          id: string;
          session_id: string | null;
          user_id: string | null;
        };
        Insert: {
          ad_id: string;
          created_at?: string;
          id?: string;
          session_id?: string | null;
          user_id?: string | null;
        };
        Update: {
          ad_id?: string;
          created_at?: string;
          id?: string;
          session_id?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ads_views_ad_id_fkey";
            columns: ["ad_id"];
            isOneToOne: false;
            referencedRelation: "ads";
            referencedColumns: ["id"];
          },
        ];
      };
      campus_suggestions: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          normalized_name: string;
          region: string | null;
          status: string;
          submitted_by: string | null;
          updated_at: string;
          use_count: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          normalized_name: string;
          region?: string | null;
          status?: string;
          submitted_by?: string | null;
          updated_at?: string;
          use_count?: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          normalized_name?: string;
          region?: string | null;
          status?: string;
          submitted_by?: string | null;
          updated_at?: string;
          use_count?: number;
        };
        Relationships: [];
      };
      campuses: {
        Row: {
          created_at: string;
          id: string;
          lat: number | null;
          lng: number | null;
          name: string;
          short: string;
        };
        Insert: {
          created_at?: string;
          id: string;
          lat?: number | null;
          lng?: number | null;
          name: string;
          short: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          lat?: number | null;
          lng?: number | null;
          name?: string;
          short?: string;
        };
        Relationships: [];
      };
      gig_boosts: {
        Row: {
          boost_level: number;
          cost: number;
          created_at: string;
          duration_days: number;
          expires_at: string;
          gig_id: string;
          id: string;
          payment_status: string;
          poster_id: string;
          started_at: string;
        };
        Insert: {
          boost_level?: number;
          cost?: number;
          created_at?: string;
          duration_days?: number;
          expires_at: string;
          gig_id: string;
          id?: string;
          payment_status?: string;
          poster_id: string;
          started_at?: string;
        };
        Update: {
          boost_level?: number;
          cost?: number;
          created_at?: string;
          duration_days?: number;
          expires_at?: string;
          gig_id?: string;
          id?: string;
          payment_status?: string;
          poster_id?: string;
          started_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "gig_boosts_gig_id_fkey";
            columns: ["gig_id"];
            isOneToOne: false;
            referencedRelation: "gigs";
            referencedColumns: ["id"];
          },
        ];
      };
      gig_interests: {
        Row: {
          created_at: string;
          gig_id: string;
          id: string;
          message: string | null;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          gig_id: string;
          id?: string;
          message?: string | null;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          gig_id?: string;
          id?: string;
          message?: string | null;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "gig_interests_gig_id_fkey";
            columns: ["gig_id"];
            isOneToOne: false;
            referencedRelation: "gigs";
            referencedColumns: ["id"];
          },
        ];
      };
      gigs: {
        Row: {
          boost_count: number;
          budget: string | null;
          campus_id: string | null;
          campus_name: string | null;
          categories: string[];
          created_at: string;
          deadline_at: string | null;
          description: string | null;
          featured: boolean;
          id: string;
          image_url: string | null;
          like_count: number;
          poster_id: string;
          promoted_until: string | null;
          region: string | null;
          status: string;
          tags: string[];
          title: string;
          updated_at: string;
          urgent: boolean;
          view_count: number;
          whatsapp: string | null;
        };
        Insert: {
          boost_count?: number;
          budget?: string | null;
          campus_id?: string | null;
          campus_name?: string | null;
          categories?: string[];
          created_at?: string;
          deadline_at?: string | null;
          description?: string | null;
          featured?: boolean;
          id?: string;
          image_url?: string | null;
          like_count?: number;
          poster_id: string;
          promoted_until?: string | null;
          region?: string | null;
          status?: string;
          tags?: string[];
          title: string;
          updated_at?: string;
          urgent?: boolean;
          view_count?: number;
          whatsapp?: string | null;
        };
        Update: {
          boost_count?: number;
          budget?: string | null;
          campus_id?: string | null;
          campus_name?: string | null;
          categories?: string[];
          created_at?: string;
          deadline_at?: string | null;
          description?: string | null;
          featured?: boolean;
          id?: string;
          image_url?: string | null;
          like_count?: number;
          poster_id?: string;
          promoted_until?: string | null;
          region?: string | null;
          status?: string;
          tags?: string[];
          title?: string;
          updated_at?: string;
          urgent?: boolean;
          view_count?: number;
          whatsapp?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "gigs_campus_id_fkey";
            columns: ["campus_id"];
            isOneToOne: false;
            referencedRelation: "campuses";
            referencedColumns: ["id"];
          },
        ];
      };
      interactions: {
        Row: {
          category: string | null;
          created_at: string;
          event: string;
          id: string;
          item_id: string;
          item_type: string;
          session_id: string | null;
          user_id: string | null;
          weight: number;
        };
        Insert: {
          category?: string | null;
          created_at?: string;
          event: string;
          id?: string;
          item_id: string;
          item_type: string;
          session_id?: string | null;
          user_id?: string | null;
          weight?: number;
        };
        Update: {
          category?: string | null;
          created_at?: string;
          event?: string;
          id?: string;
          item_id?: string;
          item_type?: string;
          session_id?: string | null;
          user_id?: string | null;
          weight?: number;
        };
        Relationships: [];
      };
      likes: {
        Row: {
          created_at: string;
          item_id: string;
          item_type: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          item_id: string;
          item_type: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          item_id?: string;
          item_type?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      onboarding_queue: {
        Row: {
          is_early_user: boolean;
          onboarded_at: string;
          user_id: string;
        };
        Insert: {
          is_early_user?: boolean;
          onboarded_at?: string;
          user_id: string;
        };
        Update: {
          is_early_user?: boolean;
          onboarded_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      product_boosts: {
        Row: {
          boost_level: number;
          cost: number;
          created_at: string;
          duration_days: number;
          expires_at: string;
          id: string;
          payment_status: string;
          product_id: string;
          seller_id: string;
          started_at: string;
        };
        Insert: {
          boost_level?: number;
          cost?: number;
          created_at?: string;
          duration_days?: number;
          expires_at: string;
          id?: string;
          payment_status?: string;
          product_id: string;
          seller_id: string;
          started_at?: string;
        };
        Update: {
          boost_level?: number;
          cost?: number;
          created_at?: string;
          duration_days?: number;
          expires_at?: string;
          id?: string;
          payment_status?: string;
          product_id?: string;
          seller_id?: string;
          started_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_boosts_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          boost_count: number;
          campus_id: string | null;
          campus_name: string | null;
          category: string;
          created_at: string;
          description: string | null;
          featured: boolean;
          hot: boolean;
          id: string;
          image_url: string | null;
          like_count: number;
          price: number;
          promoted_until: string | null;
          region: string | null;
          seller_id: string;
          status: string;
          title: string;
          updated_at: string;
          view_count: number;
          whatsapp: string | null;
        };
        Insert: {
          boost_count?: number;
          campus_id?: string | null;
          campus_name?: string | null;
          category: string;
          created_at?: string;
          description?: string | null;
          featured?: boolean;
          hot?: boolean;
          id?: string;
          image_url?: string | null;
          like_count?: number;
          price?: number;
          promoted_until?: string | null;
          region?: string | null;
          seller_id: string;
          status?: string;
          title: string;
          updated_at?: string;
          view_count?: number;
          whatsapp?: string | null;
        };
        Update: {
          boost_count?: number;
          campus_id?: string | null;
          campus_name?: string | null;
          category?: string;
          created_at?: string;
          description?: string | null;
          featured?: boolean;
          hot?: boolean;
          id?: string;
          image_url?: string | null;
          like_count?: number;
          price?: number;
          promoted_until?: string | null;
          region?: string | null;
          seller_id?: string;
          status?: string;
          title?: string;
          updated_at?: string;
          view_count?: number;
          whatsapp?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "products_campus_id_fkey";
            columns: ["campus_id"];
            isOneToOne: false;
            referencedRelation: "campuses";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          bio: string | null;
          campus_id: string | null;
          created_at: string;
          full_name: string | null;
          id: string;
          nida_number: string | null;
          phone: string | null;
          region: string | null;
          store_bio: string | null;
          store_name: string | null;
          store_slug: string | null;
          student_id: string | null;
          terms_accepted_at: string | null;
          updated_at: string;
          verified: boolean;
        };
        Insert: {
          avatar_url?: string | null;
          bio?: string | null;
          campus_id?: string | null;
          created_at?: string;
          full_name?: string | null;
          id: string;
          nida_number?: string | null;
          phone?: string | null;
          region?: string | null;
          store_bio?: string | null;
          store_name?: string | null;
          store_slug?: string | null;
          student_id?: string | null;
          terms_accepted_at?: string | null;
          updated_at?: string;
          verified?: boolean;
        };
        Update: {
          avatar_url?: string | null;
          bio?: string | null;
          campus_id?: string | null;
          created_at?: string;
          full_name?: string | null;
          id?: string;
          nida_number?: string | null;
          phone?: string | null;
          region?: string | null;
          store_bio?: string | null;
          store_name?: string | null;
          store_slug?: string | null;
          student_id?: string | null;
          terms_accepted_at?: string | null;
          updated_at?: string;
          verified?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_campus_id_fkey";
            columns: ["campus_id"];
            isOneToOne: false;
            referencedRelation: "campuses";
            referencedColumns: ["id"];
          },
        ];
      };
      saves: {
        Row: {
          created_at: string;
          item_id: string;
          item_type: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          item_id: string;
          item_type: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          item_id?: string;
          item_type?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_interests: {
        Row: {
          category: string;
          score: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          category: string;
          score?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          category?: string;
          score?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      user_subscriptions: {
        Row: {
          ads_limit: number;
          created_at: string;
          gig_limit: number;
          is_active: boolean;
          plan_type: string;
          product_limit: number;
          renews_at: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          ads_limit?: number;
          created_at?: string;
          gig_limit?: number;
          is_active?: boolean;
          plan_type?: string;
          product_limit?: number;
          renews_at?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          ads_limit?: number;
          created_at?: string;
          gig_limit?: number;
          is_active?: boolean;
          plan_type?: string;
          product_limit?: number;
          renews_at?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      wallet_ledger: {
        Row: {
          amount: number;
          created_at: string;
          id: string;
          kind: string;
          meta: Json | null;
          ref: string | null;
          user_id: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          id?: string;
          kind: string;
          meta?: Json | null;
          ref?: string | null;
          user_id: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          id?: string;
          kind?: string;
          meta?: Json | null;
          ref?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      wallets: {
        Row: {
          balance: number;
          currency: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          balance?: number;
          currency?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          balance?: number;
          currency?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      seller_profiles: {
        Row: {
          avatar_url: string | null;
          bio: string | null;
          campus_id: string | null;
          full_name: string | null;
          id: string | null;
          region: string | null;
          store_bio: string | null;
          store_name: string | null;
          store_slug: string | null;
          verified: boolean | null;
        };
        Insert: {
          avatar_url?: string | null;
          bio?: string | null;
          campus_id?: string | null;
          full_name?: string | null;
          id?: string | null;
          region?: string | null;
          store_bio?: string | null;
          store_name?: string | null;
          store_slug?: string | null;
          verified?: boolean | null;
        };
        Update: {
          avatar_url?: string | null;
          bio?: string | null;
          campus_id?: string | null;
          full_name?: string | null;
          id?: string | null;
          region?: string | null;
          store_bio?: string | null;
          store_name?: string | null;
          store_slug?: string | null;
          verified?: boolean | null;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_campus_id_fkey";
            columns: ["campus_id"];
            isOneToOne: false;
            referencedRelation: "campuses";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      is_staff: { Args: { _user_id: string }; Returns: boolean };
      request_gig_boost: {
        Args: {
          p_boost_level?: number;
          p_duration_days?: number;
          p_gig_id: string;
        };
        Returns: string;
      };
      request_product_boost: {
        Args: {
          p_boost_level?: number;
          p_duration_days?: number;
          p_product_id: string;
        };
        Returns: string;
      };
      search_gigs: {
        Args: {
          p_campus_id?: string;
          p_campus_name?: string;
          p_category?: string;
          p_limit?: number;
          p_offset?: number;
          p_region?: string;
          search_query: string;
        };
        Returns: {
          boost_count: number;
          budget: string | null;
          campus_id: string | null;
          campus_name: string | null;
          categories: string[];
          created_at: string;
          deadline_at: string | null;
          description: string | null;
          featured: boolean;
          id: string;
          image_url: string | null;
          like_count: number;
          poster_id: string;
          promoted_until: string | null;
          region: string | null;
          status: string;
          tags: string[];
          title: string;
          updated_at: string;
          urgent: boolean;
          view_count: number;
          whatsapp: string | null;
        }[];
        SetofOptions: {
          from: "*";
          to: "gigs";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      search_products: {
        Args: {
          p_campus_id?: string;
          p_campus_name?: string;
          p_category?: string;
          p_limit?: number;
          p_offset?: number;
          p_region?: string;
          search_query: string;
        };
        Returns: {
          boost_count: number;
          campus_id: string | null;
          campus_name: string | null;
          category: string;
          created_at: string;
          description: string | null;
          featured: boolean;
          hot: boolean;
          id: string;
          image_url: string | null;
          like_count: number;
          price: number;
          promoted_until: string | null;
          region: string | null;
          seller_id: string;
          status: string;
          title: string;
          updated_at: string;
          view_count: number;
          whatsapp: string | null;
        }[];
        SetofOptions: {
          from: "*";
          to: "products";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      submit_campus_suggestion: {
        Args: { suggestion_name: string; suggestion_region?: string };
        Returns: undefined;
      };
    };
    Enums: {
      app_role: "admin" | "moderator" | "user";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const;
