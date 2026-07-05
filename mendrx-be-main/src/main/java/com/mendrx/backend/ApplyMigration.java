package com.mendrx.backend;

import java.nio.file.Files;
import java.nio.file.Paths;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;

public class ApplyMigration {
    public static void main(String[] args) {
        String url = "jdbc:postgresql://aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres";
        String user = "postgres.leorjexcwtionqachqfy";
        String password = "Pradyuth@4138";

        try (Connection conn = DriverManager.getConnection(url, user, password)) {
            String sql = new String(Files.readAllBytes(Paths.get("add_cascade_deletes.sql")));
            String[] statements = sql.split(";");
            
            try (Statement stmt = conn.createStatement()) {
                for (String s : statements) {
                    if (!s.trim().isEmpty()) {
                        System.out.println("Executing: " + s.trim());
                        stmt.execute(s.trim());
                    }
                }
                System.out.println("Migration applied successfully.");
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
