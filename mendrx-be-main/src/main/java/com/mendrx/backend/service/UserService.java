package com.mendrx.backend.service;

import com.mendrx.backend.dto.ParentDTO;
import com.mendrx.backend.dto.UserDTO;
import com.mendrx.backend.enums.SubscriptionTypeEnum;
import com.mendrx.backend.model.AcademyInvitation;
import com.mendrx.backend.model.Parent;
import com.mendrx.backend.model.Subscription;
import com.mendrx.backend.model.User;
import com.mendrx.backend.repository.AcademyInvitationRepository;
import com.mendrx.backend.repository.ParentRepository;
import com.mendrx.backend.repository.SubscriptionRepository;
import com.mendrx.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static com.mendrx.backend.enums.SubscriptionTypeEnum.FREE_TRIAL;
import static com.mendrx.backend.enums.UserTypeEnum.PRACTITIONER;

@Service
public class UserService {
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private SubscriptionRepository subscriptionRepository;

    @Autowired
    private JwtValidatorService jwtValidatorService;

    @Autowired
    private AcademyInvitationRepository academyInvitationRepository;

    @Autowired
    private ParentRepository parentRepository;

    @Autowired
    private WebsiteLogoWhiteLabelService websiteLogoWhiteLabelService;

    private final Integer freeCredits = 200;
    private final Integer defaultParentId = 1;

    @Transactional
    public UserDTO registerUser(String token, String email) {
        UUID authId = jwtValidatorService.getSubjectFromToken(token);
        if (authId == null) {
            throw new IllegalArgumentException("Invalid token");
        }

        // Check if user already exists
        User existingUser = userRepository.findByAuthId(authId);
        if (existingUser != null) {
            throw new IllegalStateException("User already exists");
        }

        // Create new user
        User newUser = new User();
        newUser.setAuthId(authId);
        newUser.setEmail(email);
        newUser.setType(PRACTITIONER); // Default to practitioner

        SubscriptionTypeEnum subscriptionType = FREE_TRIAL;

        Optional<AcademyInvitation> invitationOpt = academyInvitationRepository.findByEmailIgnoreCase(email);

        if (invitationOpt.isPresent()) {
            AcademyInvitation invitation = invitationOpt.get();

            // (A) Always associate this user with the Parent
            Integer parentId = invitation.getParentId();
            if (parentId == null) {
                throw new IllegalStateException("Invitation has a null parentId. Cannot associate user.");
            }

            Parent parent = parentRepository.findById(parentId)
                    .orElseThrow(() -> new IllegalStateException("Parent (academy) not found for ID: " + parentId));

            newUser.setParent(parent);

            // (B) Check if payment is done
            if (Boolean.TRUE.equals(invitation.getPaymentDone())) {
                // Use parent's subscription period & credits
                subscriptionType = parent.getSubscriptionType();

                int months = subscriptionType.getMonths();
                LocalDateTime expiry = LocalDateTime.now().plusMonths(months);
                newUser.setSubscriptionExpiry(expiry);

                Integer parentCredits = parent.getSubscriptionCredits();
                if (parentCredits == null) {
                    parentCredits = freeCredits; // fallback if none set
                }
                newUser.setCredits(parentCredits);
            } else {
                // Payment not done => fallback to free credits & 1-month expiry
                newUser.setSubscriptionExpiry(LocalDateTime.now().plusMonths(FREE_TRIAL.getMonths()));
                newUser.setCredits(freeCredits);
            }

        } else {
            // 5. If no invitation found -> treat as independent user (free trial)
            Parent parent = parentRepository.findById(defaultParentId)
                    .orElseThrow(() -> new IllegalStateException("Parent (academy) not found for ID: " + defaultParentId));

            newUser.setParent(parent);
            newUser.setSubscriptionExpiry(LocalDateTime.now().plusMonths(FREE_TRIAL.getMonths()));
            newUser.setCredits(freeCredits);
        }

        User registeredUser = userRepository.save(newUser);
        Subscription subscription = new Subscription(
                registeredUser,
                registeredUser.getCredits(),             // final determined credits
                subscriptionType,                              // or your subscription type
                registeredUser.getSubscriptionExpiry()   // final determined expiry
        );

        subscriptionRepository.save(subscription);

        Parent parent = registeredUser.getParent();
        ParentDTO parentDTO = new ParentDTO();
        parentDTO.setUseParentWhiteLabels(parent.getUseParentWhiteLabels());
        parentDTO.setRcaEnabled(parent.getRcaEnabled());
        parentDTO.setSupplementsEnabled(parent.getSupplementsEnabled());
        parentDTO.setDietPlanEnabled(parent.getDietPlanEnabled());
        parentDTO.setDietVersioningEnabled(parent.getDietVersioningEnabled());
        parentDTO.setSupplementsAutoPopulationEnabled(parent.getSupplementsAutoPopulationEnabled());
        parentDTO.setLifestyleRecEnabled(parent.getLifestyleRecommendationsEnabled());
        parentDTO.setProtocolEnabled(parent.getProtocolEnabled());
        parentDTO.setComparisonEnabled(parent.getComparisonEnabled());
        parentDTO.setWebsiteWhiteLabelLogoFileUrl(websiteLogoWhiteLabelService.generateSignedUrl(parent.getWebsiteWhiteLabelLogoFileName()));

        return new UserDTO(registeredUser.getEmail(), registeredUser.getType(), registeredUser.getCredits(), registeredUser.getSubscriptionExpiry(), parentDTO);
    }

    @Transactional(readOnly = true)
    public User getUserByToken(String token) {
        UUID authId = jwtValidatorService.getSubjectFromToken(token);
        if (authId == null) {
            throw new IllegalArgumentException("Invalid token");
        }

        return userRepository.findByAuthId(authId);
    }

    @Transactional(readOnly = true)
    public UserDTO getUserDTOByToken(String token) {
        User user = getUserByToken(token);
        if (user == null) {
            return null;
        }
        Parent parent = user.getParent();
        ParentDTO parentDTO = new ParentDTO();
        parentDTO.setUseParentWhiteLabels(parent.getUseParentWhiteLabels());
        parentDTO.setRcaEnabled(parent.getRcaEnabled());
        parentDTO.setSupplementsEnabled(parent.getSupplementsEnabled());
        parentDTO.setDietPlanEnabled(parent.getDietPlanEnabled());
        parentDTO.setDietVersioningEnabled(parent.getDietVersioningEnabled());
        parentDTO.setSupplementsAutoPopulationEnabled(parent.getSupplementsAutoPopulationEnabled());
        parentDTO.setComparisonEnabled(parent.getComparisonEnabled());
        parentDTO.setLifestyleRecEnabled(parent.getLifestyleRecommendationsEnabled());
        parentDTO.setProtocolEnabled(parent.getProtocolEnabled());
        parentDTO.setWebsiteWhiteLabelLogoFileUrl(websiteLogoWhiteLabelService.generateSignedUrl(parent.getWebsiteWhiteLabelLogoFileName()));

        return new UserDTO(user.getEmail(), user.getType(), user.getCredits(), user.getSubscriptionExpiry(), parentDTO);
    }

    @Transactional
    public void updateUser(User user) {
        userRepository.save(user);
    }

    @Transactional
    public User deductCredits(User user, int credits) {
        user.setCredits(user.getCredits() - credits);
        return userRepository.save(user);
    }

    @Transactional
    public User save(User user) {
        return userRepository.save(user);
    }

    @Transactional
    public UserDTO updateCustomDisclaimer(String token, String disclaimer) {
        User user = getUserByToken(token);
        if (user == null) {
            throw new IllegalStateException("User not found");
        }

        // Validate disclaimer
        if (disclaimer == null || disclaimer.trim().isEmpty()) {
            throw new IllegalArgumentException("Disclaimer cannot be empty");
        }

        // Update the disclaimer
        user.setCustomDisclaimer(disclaimer.trim());
        User updatedUser = userRepository.save(user);

        Parent parent = updatedUser.getParent();
        ParentDTO parentDTO = new ParentDTO();
        parentDTO.setUseParentWhiteLabels(parent.getUseParentWhiteLabels());
        parentDTO.setRcaEnabled(parent.getRcaEnabled());
        parentDTO.setSupplementsEnabled(parent.getSupplementsEnabled());
        parentDTO.setDietPlanEnabled(parent.getDietPlanEnabled());
        parentDTO.setDietVersioningEnabled(parent.getDietVersioningEnabled());
        parentDTO.setSupplementsAutoPopulationEnabled(parent.getSupplementsAutoPopulationEnabled());
        parentDTO.setLifestyleRecEnabled(parent.getLifestyleRecommendationsEnabled());
        parentDTO.setProtocolEnabled(parent.getProtocolEnabled());
        parentDTO.setComparisonEnabled(parent.getComparisonEnabled());
        parentDTO.setWebsiteWhiteLabelLogoFileUrl(websiteLogoWhiteLabelService.generateSignedUrl(parent.getWebsiteWhiteLabelLogoFileName()));

        // Return updated user DTO
        return new UserDTO(
                updatedUser.getEmail(),
                updatedUser.getType(),
                updatedUser.getCredits(),
                updatedUser.getSubscriptionExpiry(),
                parentDTO
        );
    }

    @Transactional
    public void saveWatermarkFileNameInParent(User user, String fileName) {
        Parent parent = user.getParent();
        parent.setWatermarkFileName(fileName);
        parentRepository.save(parent);
    }
}
