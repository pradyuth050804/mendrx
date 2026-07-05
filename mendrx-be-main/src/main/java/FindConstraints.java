import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;

public class FindConstraints {
    public static void main(String[] args) {
        String url = "jdbc:postgresql://aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres";
        String user = "postgres.leorjexcwtionqachqfy";
        String password = "Pradyuth@4138";

        try (Connection conn = DriverManager.getConnection(url, user, password)) {
            String query = "SELECT " +
                    "    tc.table_name, " +
                    "    kcu.column_name, " +
                    "    ccu.table_name AS foreign_table_name, " +
                    "    ccu.column_name AS foreign_column_name, " +
                    "    rc.update_rule, " +
                    "    rc.delete_rule, " +
                    "    tc.constraint_name " +
                    "FROM information_schema.table_constraints tc " +
                    "JOIN information_schema.key_column_usage kcu " +
                    "  ON tc.constraint_name = kcu.constraint_name " +
                    "  AND tc.table_schema = kcu.table_schema " +
                    "JOIN information_schema.constraint_column_usage ccu " +
                    "  ON ccu.constraint_name = tc.constraint_name " +
                    "  AND ccu.table_schema = tc.table_schema " +
                    "JOIN information_schema.referential_constraints rc " +
                    "  ON rc.constraint_name = tc.constraint_name " +
                    "WHERE tc.constraint_type = 'FOREIGN KEY';";

            try (PreparedStatement stmt = conn.prepareStatement(query)) {
                ResultSet rs = stmt.executeQuery();
                System.out.println("table_name | column_name | foreign_table_name | constraint_name | delete_rule");
                System.out.println("-----------------------------------------------------------------------------");
                while(rs.next()) {
                    System.out.println(
                        rs.getString("table_name") + " | " +
                        rs.getString("column_name") + " | " +
                        rs.getString("foreign_table_name") + " | " +
                        rs.getString("constraint_name") + " | " +
                        rs.getString("delete_rule")
                    );
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
