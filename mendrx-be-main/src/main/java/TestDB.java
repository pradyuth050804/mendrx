import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;

public class TestDB {
    public static void main(String[] args) {
        String url = "jdbc:postgresql://aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres";
        String user = "postgres.leorjexcwtionqachqfy";
        String password = "Pradyuth@4138";

        try (Connection conn = DriverManager.getConnection(url, user, password)) {
            String updateQuery = "UPDATE snd_plan SET supplement_notes = (SELECT supplement_notes FROM snd_plan WHERE id = '1aa2c280-c580-4a00-8d5a-4663e0f723ed') WHERE id = 'a771f96e-455a-412a-a34f-5b0c853a861f'";
            try (PreparedStatement stmt = conn.prepareStatement(updateQuery)) {
                int rows = stmt.executeUpdate();
                System.out.println("Updated " + rows + " snd_plan with notes.");
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
